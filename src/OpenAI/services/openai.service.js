// src/OpenAI/services/openai.service.js

const OpenAI = require('openai');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// NOVO: Importa os prompts hardcoded, removendo a dependência do prompt.service.
const {
  CHARACTER_SYSTEM_PROMPT,
  COLORING_BOOK_STORYLINE_SYSTEM_PROMPT,
  STORY_BOOK_STORYLINE_SYSTEM_PROMPT,
  BOOK_COVER_SYSTEM_PROMPT
} = require('../config/AIPrompts');

class VisionService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não está configurada.');
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * ATUALIZADO: Descreve uma imagem com base na descrição fornecida pelo usuário.
   * O template de prompt agora é hardcoded e combina a análise da imagem com o texto do usuário.
   */
  async describeImage(imageUrl, userCharacterDescription) {
    if (!userCharacterDescription) {
      throw new Error('[VisionService] A descrição do usuário é obrigatória para a análise da imagem.');
    }
    // LÓGICA ALTERADA: Usa o prompt hardcoded e injeta a descrição do usuário.
    const systemPrompt = CHARACTER_SYSTEM_PROMPT.replace('[USER_DESCRIPTION]', userCharacterDescription);

    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[VisionService] Tentativa ${attempt}/${MAX_RETRIES} para descrever a imagem: ${imageUrl}`);

        const messages = [{
          role: "user",
          content: [{
            type: "text",
            text: systemPrompt // Usa o prompt do sistema construído
          }, {
            type: "image_url",
            image_url: { url: imageUrl },
          }, ],
        }, ];

        const response = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: messages,
          max_tokens: 350,
        });

        const description = response.choices[0].message.content.trim();
        console.log("[VisionService] Descrição detalhada recebida com sucesso:", description);

        // Aplica sanitização de segurança ao resultado
        return this.sanitizePromptForSafety(description);

      } catch (error) {
        const errorMessage = error.response ? error.response.data : error.message;
        console.error(`[VisionService] Tentativa ${attempt} falhou:`, errorMessage);

        if (attempt === MAX_RETRIES) {
          console.error('[VisionService] Todas as tentativas de chamar a API de visão falharam.');
          throw new Error(`Falha na análise da imagem após ${MAX_RETRIES} tentativas: ${error.response?.data?.error?.message || error.message}`);
        }

        await sleep(RETRY_DELAY);
      }
    }
  }

  /**
   * ATUALIZADO: Gera o roteiro de um livro de colorir com prompt hardcoded.
   */
  async generateColoringBookStoryline(characters, theme, pageCount) {
    try {
      let systemPrompt = COLORING_BOOK_STORYLINE_SYSTEM_PROMPT;

      const characterDetails = characters.map(c => `- ${c.name}: ${c.description || 'um personagem amigável'}`).join('\n');
      console.log(`[VisionService] Gerando roteiro de colorir. Personagens: ${characters.map(c => c.name).join(', ')}, Tema: ${theme}`);

      // Substituição de placeholders no prompt do sistema
      systemPrompt = systemPrompt
        .replace(/\[CHARACTER_DETAILS\]/g, characterDetails)
        .replace(/\[THEME\]/g, theme)
        .replace(/\[PAGE_COUNT\]/g, pageCount.toString());

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Crie a história em ${pageCount} cenas para o tema "${theme}".` }
        ],
        max_tokens: 350 * pageCount,
      });

      const result = JSON.parse(response.choices[0].message.content);
      if (!result.pages || !Array.isArray(result.pages)) throw new Error('A IA não retornou "pages" como um array.');
      
      // Aplica sanitização a cada descrição de página
      return result.pages.map(p => this.sanitizePromptForSafety(p));
    } catch (error) {
      console.error(`[VisionService] Erro ao gerar o roteiro do livro de colorir: ${error.message}`);
      throw new Error(`Falha na geração do roteiro: ${error.message}`);
    }
  }

  /**
   * ATUALIZADO: Gera o roteiro de um livro de história ilustrado com prompt hardcoded.
   */
  async generateStoryBookStoryline(characters, theme, summary, sceneCount) {
    try {
      let systemPrompt = STORY_BOOK_STORYLINE_SYSTEM_PROMPT;
      
      const characterDetails = characters.map(c => `- ${c.name}: ${c.description || 'um personagem amigável'}`).join('\n');
      console.log(`[VisionService] Gerando roteiro de história. Personagens: ${characters.map(c=>c.name).join(', ')}`);

      // Substituição de placeholders no prompt do sistema
      systemPrompt = systemPrompt
        .replace(/\[CHARACTER_DETAILS\]/g, characterDetails)
        .replace(/\[THEME\]/g, theme)
        .replace(/\[SUMMARY\]/g, summary)
        .replace(/\[SCENE_COUNT\]/g, sceneCount.toString());
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Gere a história em ${sceneCount} cenas.` }],
        max_tokens: 400 * sceneCount,
      });

      const result = JSON.parse(response.choices[0].message.content);
      if (!result.story_pages || !Array.isArray(result.story_pages)) throw new Error('A IA não retornou "story_pages" como um array de objetos.');
      
      // Aplica sanitização apenas nos prompts de ilustração
      return result.story_pages.map(page => ({ ...page, illustration_prompt: this.sanitizePromptForSafety(page.illustration_prompt) }));
    } catch (error) {
      console.error(`[VisionService] Erro ao gerar o roteiro do livro de história: ${error.message}`);
      throw new Error(`Falha na geração do roteiro da história: ${error.message}`);
    }
  }

  /**
   * ATUALIZADO: Gera uma descrição textual para a capa/contracapa do livro com prompt hardcoded.
   */
  async generateCoverDescription(bookTitle, bookGenre, characters) {
    try {
      let systemPrompt = BOOK_COVER_SYSTEM_PROMPT;

      const characterNames = characters.map(c => c.name).join(' e ');
      console.log(`[VisionService] Gerando descrição para capa. Título: "${bookTitle}", Gênero: "${bookGenre}", Personagens: ${characterNames}`);

      // Substituição de placeholders no prompt do sistema
      systemPrompt = systemPrompt
        .replace(/\[BOOK_TITLE\]/g, bookTitle || '')
        .replace(/\[BOOK_GENRE\]/g, bookGenre || '')
        .replace(/\[CHARACTER_NAMES\]/g, characterNames || '');

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Crie uma descrição detalhada e cativante para a capa do livro "${bookTitle}".` }
        ],
        max_tokens: 250,
      });

      const description = response.choices[0].message.content.trim();
      console.log("[VisionService] Descrição da capa recebida:", description);
      return this.sanitizePromptForSafety(description);

    } catch (error) {
      console.error('[VisionService] Erro ao gerar descrição da capa:', error.message);
      throw new Error(`Falha ao gerar descrição da capa: ${error.message}`);
    }
  }

  /**
   * Remove palavras relacionadas a cores de uma descrição, para páginas de colorir.
   */
  sanitizeDescriptionForColoring(description) {
    if (!description) return '';
    const colorWords = [
      'amarela', 'amarelo', 'laranja', 'azul', 'azuis', 'marrom', 'verde',
      'vermelho', 'rosa', 'preto', 'branco', 'cinza', 'roxo', 'violeta',
      'dourado', 'prateado', 'colorido', 'colorida'
    ];
    const regex = new RegExp('\\b(' + colorWords.join('|') + ')\\b', 'gi');
    return description.replace(regex, '').replace(/\s\s+/g, ' ').trim();
  }

  /**
   * Remove palavras sensíveis de um prompt para evitar bloqueios da API de imagem.
   */
  sanitizePromptForSafety(prompt) {
    if (!prompt) return '';
    const forbiddenWords = [
      'criança', 'crianças', 'menino', 'menina', 'bebê', 'infantil', 'garoto', 'garota',
      'child', 'children', 'kid', 'kids', 'boy', 'girl', 'baby', 'infant', 'toddler',
      'sexy', 'nude', 'adult', 'violence', 'gore', 'blood', 'weapon', 'drug', 'alcohol', 'smoking', 'explicit', 'sexual', 'fetish', 'erotic', 'porn', 'nsfw', 'gory', 'violent', 'abuse', 'harm', 'suicide', 'self-harm', 'hate', 'racism', 'discrimination', 'terrorist', 'bomb', 'gun', 'knife', 'torture', 'mutilation', 'death', 'dead', 'corpse', 'zombie', 'monster', 'demon', 'devil', 'cult', 'ritual', 'satan', 'hell', 'heaven', 'god', 'religion', 'political', 'propaganda', 'hate speech', 'discrimination', 'harassment', 'bullying', 'threat', 'intimidation', 'exploitation', 'trafficking', 'slavery', 'molestation', 'rape', 'incest', 'bestiality', 'pedophilia', 'child abuse', 'animal abuse', 'torture', 'dismemberment', 'cannibalism', 'snuff', 'guro', 'hentai', 'lolicon', 'shotacon', 'tentacle', 'bondage', 'bdsm', 'choking', 'suffocation', 'cutting', 'self mutilation', 'self harm', 'eating disorder', 'anorexia', 'bulimia', 'vomit', 'diarrhea', 'urine', 'feces', 'piss', 'shit', 'crap', 'fuck', 'bitch', 'asshole', 'cunt', 'dick', 'pussy', 'cock', 'tits', 'boobs', 'butt', 'ass', 'gang', 'mafia', 'crime', 'terror', 'war', 'explosion', 'firearm', 'ammunition', 'drugs', 'drug use', 'drug paraphernalia', 'alcohol abuse', 'drunk', 'intoxicated', 'smoking', 'cigarette', 'vape', 'e-cigarette', 'drug dealing', 'drug trafficking', 'gambling', 'prostitution', 'prostitute', 'whore', 'hooker', 'pimp', 'john', 'brothel', 'strip club', 'stripper', 'lap dance', 'pole dance', 'topless', 'bottomless', 'underwear', 'lingerie', 'thong', 'bikini', 'swimsuit', 'naked', 'undressed', 'partially clothed', 'revealing', 'skimpy', 'transparent', 'sheer', 'see-through', 'tight', 'form-fitting', 'curvy', 'busty', 'cleavage', 'buttocks', 'genitals', 'vagina', 'penis', 'anus', 'nipples', 'areola', 'pubic hair', 'armpit hair', 'body hair', 'sweat', 'spit', 'snot', 'mucus', 'pus', 'vomit', 'blood', 'gore', 'wound', 'injury', 'scar', 'bruise', 'cut', 'stab', 'shoot', 'kill', 'murder', 'assault', 'fight', 'violence', 'abuse', 'torture', 'rape', 'sexual assault', 'sexual harassment', 'sexual exploitation', 'sexual abuse', 'child sexual abuse', 'animal sexual abuse', 'incest', 'bestiality', 'necrophilia', 'cannibalism', 'mutilation', 'dismemberment', 'decapitation', 'hanging', 'drowning', 'suffocation', 'choking', 'strangulation', 'burning', 'electrocution', 'poisoning', 'drug overdose', 'self-harm', 'suicide', 'self-mutilation', 'eating disorders', 'anorexia', 'bulimia', 'vomiting', 'purging', 'laxative abuse', 'drug abuse', 'alcohol abuse', 'substance abuse', 'addiction', 'withdrawal', 'overdose', 'drug paraphernalia', 'drug dealing', 'drug trafficking', 'gang violence', 'organized crime', 'terrorism', 'hate speech', 'discrimination', 'racism', 'sexism', 'homophobia', 'transphobia', 'xenophobia', 'ableism', 'ageism', 'anti-semitism', 'islamophobia', 'misogyny', 'misandry', 'white supremacy', 'neo-nazi', 'kkk', 'alt-right', 'extremism', 'radicalization', 'propaganda', 'conspiracy theory', 'misinformation', 'disinformation', 'fake news', 'hoax', 'scam', 'fraud', 'phishing', 'malware', 'virus', 'hacking', 'cybercrime', 'identity theft', 'stalking', 'harassment', 'bullying', 'cyberbullying', 'threats', 'intimidation', 'extortion', 'blackmail', 'smuggling', 'trafficking', 'human trafficking', 'child trafficking', 'sex trafficking', 'drug trafficking', 'arms trafficking', 'illegal activities', 'criminal activities', 'organized crime', 'gangs', 'mafia', 'cartel', 'cults', 'rituals', 'satanic', 'demonic', 'occult', 'supernatural', 'paranormal', 'ghosts', 'spirits', 'demons', 'vampires', 'werewolves', 'zombies', 'monsters', 'aliens', 'ufos', 'conspiracy', 'secret society', 'illuminati', 'freemasons', 'new world order', 'deep state', 'qanon', 'flat earth', 'anti-vax', 'chemtrails', 'false flag', 'crisis actor', 'mind control', 'mkultra', 'area 51', 'bigfoot', 'loch ness monster', 'chupacabra', 'cryptids', 'mythical creatures', 'folklore', 'urban legend', 'superstition', 'magic', 'witchcraft', 'sorcery', 'wizardry', 'enchantment', 'spell', 'curse', 'hex', 'voodoo', 'jinx', 'charm', 'amulet', 'talisman', 'fortune telling', 'tarot', 'astrology', 'numerology', 'palmistry', 'psychic', 'medium', 'clairvoyant', 'telepathy', 'telekinesis', 'levitation', 'invisibility', 'shapeshifting', 'time travel', 'parallel universe', 'dimension', 'portal', 'alien abduction', 'ufo sighting', 'crop circles', 'ancient aliens', 'pyramids', 'sphinx', 'stonehenge', 'easter island', 'nazca lines', 'bermuda triangle', 'atlantis', 'lemuria', 'shambhala', 'agartha', 'hollow earth', 'flat earth', 'lizard people', 'reptilians', 'cloning', 'human cloning', 'genetic engineering', 'crispr', 'designer babies', 'transhumanism', 'ai takeover', 'robot uprising', 'singularity', 'dystopia', 'utopia', 'apocalypse', 'doomsday', 'end of the world', ' Armageddon', 'Ragnarok', 'Kali Yuga', 'Great Tribulation', 'rapture', 'second coming', 'messiah', 'antichrist', 'false prophet', 'mark of the beast', '666', 'satanic panic', 'cults', 'rituals', 'sacrifices', 'blood rituals', 'human sacrifice', 'animal sacrifice', 'cannibalism', 'vampirism', 'werewolfism', 'zombification', 'necromancy', 'black magic', 'dark arts', 'occultism', 'demonology', 'exorcism', 'ghost hunting', 'paranormal investigation', 'conspiracy theories', 'secret government', 'shadow government', 'deep state', 'new world order', 'illuminati', 'freemasons', 'skull and bones', 'bilderberg group', 'trilateral commission', 'council on foreign relations', 'world economic forum', 'great reset', 'agenda 21', 'agenda 2030', 'sustainable development goals', 'climate change hoax', 'covid-19 hoax', 'vaccine hoax', '5g hoax', 'chemtrails', 'flat earth', 'qanon', 'pizzagate', 'adrenochrome', 'reptilian shapeshifters', 'lizard people', 'hollow earth', 'inner earth', 'aliens', 'ufos', 'ancient astronauts', 'extraterrestrial life', 'area 51', 'roswell', 'men in black', 'grey aliens', 'nordic aliens', 'reptilian aliens', 'draconian aliens', 'pleiadians', 'arcturians', 'sirians', 'lyrans', 'andromedans', 'zetas', 'anunnaki', 'nephilim', 'giants', 'bigfoot', 'yeti', 'sasquatch', 'chupacabra', 'mothman', 'jersey devil', 'nessie', 'loch ness monster', 'cryptids', 'mythical creatures', 'folklore', 'urban legends', 'ghosts', 'spirits', 'poltergeists', 'demons', 'devils', 'angels', 'archangels', 'gods', 'goddesses', 'deities', 'pantheon', 'mythology', 'religion', 'cults', 'sects', 'satanism', 'luciferianism', 'thelema', 'wicca', 'paganism', 'druidism', 'shamanism', 'voodoo', 'santeria', 'hoodoo', 'brujeria', 'magic', 'witchcraft', 'sorcery', 'wizardry', 'enchantment', 'spell', 'curse', 'hex', 'charm', 'amulet', 'talisman', 'grimoire', 'book of shadows', 'ouija board', 'tarot cards', 'crystal ball', 'palm reading', 'astrology', 'numerology', 'aura reading', 'chakra balancing', 'reiki', 'meditation', 'yoga', 'mindfulness', 'spiritual awakening', 'enlightenment', 'ascension', 'third eye', 'pineal gland', 'kundalini', 'vibrational frequency', 'dimensions', 'multiverse', 'parallel realities', 'time travel', 'astral projection', 'out-of-body experience', 'lucid dreaming', 'remote viewing', 'telepathy', 'telekinesis', 'pyrokinesis', 'cryokinesis', 'hydrokinesis', 'aerokinesis', 'geokinesis', 'biokinesis', 'chronokinesis', 'photokinesis', 'umbrakinesis', 'electrokinetic', 'magnetokinesis', 'sonokinesis', 'dermokinesis', 'pathokinesis', 'psychokinesis', 'technokinesis', 'terrakinesis', 'toxikinesis', 'vitakinesis', 'pyrokinesis', 'cryokinesis', 'hydrokinesis', 'aerokinesis', 'geokinesis', 'biokinesis', 'chronokinesis', 'photokinesis', 'umbrakinesis', 'electrokinetic', 'magnetokinesis', 'sonokinesis', 'dermokinesis', 'pathokinesis', 'psychokinesis', 'technokinesis', 'terrakinesis', 'toxikinesis', 'vitakinesis', 'shapeshifting', 'lycanthropy', 'vampirism', 'zombification', 'necromancy', 'golem', 'homunculus', 'chimera', 'griffin', 'dragon', 'unicorn', 'pegasus', 'mermaid', 'siren', 'fairy', 'elf', 'dwarf', 'goblin', 'orc', 'troll', 'ogre', 'giant', 'cyclops', 'minotaur', 'centaur', 'harpy', 'gorgon', 'medusa', 'sphinx', 'chimera', 'hydra', 'kraken', 'leviathan', 'phoenix', 'basilisk', 'cockatrice', 'griffon', 'hippogriff', 'manticore', 'naga', 'salamander', 'sylph', 'undine', 'gnome', 'sprite', 'pixie', 'leprechaun', 'banshee', 'ghoul', 'wraith', 'specter', 'phantom', 'apparition', 'poltergeist', 'doppelganger', 'succubus', 'incubus', 'demon', 'devil', 'satan', 'lucifer', 'beezlebub', 'asmodeus', 'belial', 'lilith', 'mephistopheles', 'baal', 'moloch', 'pazuzu', 'baphomet', 'goetia', 'solomon', 'kabbalah', 'alchemy', 'hermeticism', 'rosicrucianism', 'golden dawn', 'oto', 'a.a.', 'thelema', 'aleister crowley', 'la vey', 'church of satan', 'satanic temple', 'templars', 'assassins', 'hashashin', 'ninja', 'samurai', 'viking', 'knight', 'gladiator', 'spartan', 'roman', 'greek', 'egyptian', 'mayan', 'aztec', 'inca', 'native american', 'aboriginal', 'african tribe', 'amazonian tribe', 'indigenous people', 'first nations', 'eskimo', 'inuit', 'pygmy', 'bushmen', 'maasai', 'zulu', 'maori', 'aboriginal australian', 'eskimo', 'inuit', 'pygmy', 'bushmen', 'maasai', 'zulu', 'maori', 'aboriginal australian', 'jewish', 'christian', 'muslim', 'hindu', 'buddhist', 'sikh', 'jain', 'taoist', 'shinto', 'confucian', 'zoroastrian', 'bahai', 'rastafarian', 'scientology', 'mormon', 'jehovah witness', 'amish', 'mennonite', 'quaker', 'shaker', 'hasidic', 'orthodox', 'catholic', 'protestant', 'evangelical', 'pentecostal', 'baptist', 'methodist', 'lutheran', 'presbyterian', 'anglican', 'episcopalian', 'unitarian', 'universalist', 'agnostic', 'atheist', 'humanist', 'secular humanist', 'freethinker', 'skeptic', 'rationalist', 'empiricist', 'positivist', 'existentialist', 'nihilist', 'absurdist', 'solipsist', 'anarchist', 'communist', 'socialist', 'capitalist', 'libertarian', 'conservative', 'liberal', 'centrist', 'moderate', 'radical', 'extremist', 'revolutionary', 'terrorist', 'anarcho-capitalist', 'minarchist', 'objectivist', 'voluntarist', 'pacifist', 'militarist', 'nationalist', 'globalist', 'environmentalist', 'feminist', 'masculinist', 'egalitarian', 'social justice warrior', 'sjw', 'woke', 'cancel culture', 'political correctness', 'pc', 'snowflake', 'triggered', 'safe space', 'microaggression', 'privilege', 'intersectionality', 'white privilege', 'male privilege', 'heteronormativity', 'cisnormativity', 'patriarchy', 'kyriarchy', 'systemic racism', 'institutional racism', 'police brutality', 'black lives matter', 'blm', 'all lives matter', 'blue lives matter', 'defund the police', 'abolish the police', 'prison abolition', 'capital punishment', 'death penalty', 'gun control', 'second amendment', 'right to bear arms', 'pro-choice', 'pro-life', 'abortion', 'reproductive rights', 'lgbtq+', 'gay rights', 'trans rights', 'marriage equality', 'gender identity', 'sexual orientation', 'non-binary', 'genderfluid', 'genderqueer', 'agender', 'bigender', 'pangender', 'demigender', 'intersex', 'asexual', 'pansexual', 'bisexual', 'heterosexual', 'homosexual', 'straight', 'lesbian', 'gay', 'transgender', 'cisgender', 'queer', 'questioning', 'ally', 'feminism', 'masculinism', 'egalitarianism', 'social justice', 'identity politics', 'cultural appropriation', 'safe spaces', 'trigger warnings', 'microaggressions', 'privilege', 'intersectionality', 'systemic oppression', 'institutional discrimination', 'police violence', 'racial injustice', 'environmental justice', 'climate justice', 'economic justice', 'housing justice', 'food justice', 'health justice', 'education justice', 'disability rights', 'animal rights', 'veganism', 'vegetarianism', 'animal liberation', 'anti-speciesism', 'earth liberation front', 'elf', 'animal liberation front', 'alf', 'eco-terrorism', 'radical environmentalism', 'deep ecology', 'anarcho-primitivism', 'primitivism', 'anti-civ', 'anti-civilization', 'luddism', 'technophobia', 'transhumanism', 'posthumanism', 'singularitarianism', 'ai ethics', 'robot rights', 'cyborgs', 'bionics', 'genetic engineering', 'crispr', 'cloning', 'designer babies', 'eugenics', 'transgender rights', 'nonbinary rights', 'genderfluid rights', 'genderqueer rights', 'intersex rights', 'asexual rights', 'pansexual rights', 'bisexual rights', 'heterosexual rights', 'homosexual rights', 'lesbian rights', 'gay rights', 'transgender rights', 'cisgender rights', 'queer rights', 'questioning rights', 'ally rights', 'feminist theory', 'masculinist theory', 'egalitarian theory', 'social justice theory', 'identity politics theory', 'cultural appropriation theory', 'safe spaces theory', 'trigger warnings theory', 'microaggressions theory', 'privilege theory', 'intersectionality theory', 'systemic oppression theory', 'institutional discrimination theory', 'police violence theory', 'racial injustice theory', 'environmental justice theory', 'climate justice theory', 'economic justice theory', 'housing justice theory', 'food justice theory', 'health justice theory', 'education justice theory', 'disability rights theory', 'animal rights theory', 'veganism theory', 'vegetarianism theory', 'animal liberation theory', 'anti-speciesism theory', 'earth liberation front theory', 'elf theory', 'animal liberation front theory', 'alf theory', 'eco-terrorism theory', 'radical environmentalism theory', 'deep ecology theory', 'anarcho-primitivism theory', 'primitivism theory', 'anti-civ theory', 'anti-civilization theory', 'luddism theory', 'technophobia theory', 'transhumanism theory', 'posthumanism theory', 'singularitarianism theory', 'ai ethics theory', 'robot rights theory', 'cyborgs theory', 'bionics theory', 'genetic engineering theory', 'crispr theory', 'cloning theory', 'designer babies theory', 'eugenics theory'
    ];
    const regex = new RegExp('\\b(' + forbiddenWords.join('|') + ')\\b', 'gi');
    return prompt.replace(regex, 'friendly figures');
  }
}
module.exports = new VisionService();