const { Character } = require('../../models');
const { downloadAndSaveImage } = require('../../OpenAI/utils/imageDownloader');

class WebhookService {
  async processLeonardoResult(payload) {
    // A estrutura do payload pode variar, verifique a documentação do Leonardo.
    // Vamos supor que ele envie algo como:
    // { generationId: "...", status: "COMPLETE", generated_images: [{ url: "..." }] }
    
    const { generationId, status, generated_images } = payload;
    
    if (status !== 'COMPLETE' || !generated_images || generated_images.length === 0) {
      console.log(`[WebhookService] Geração ${generationId} não foi bem-sucedida. Status: ${status}`);
      // Lógica para marcar o personagem como falho, se necessário.
      const character = await Character.findOne({ where: { generationJobId: generationId } });
      if (character) {
          await character.update({ name: 'Falha na Geração', description: `Status do Leonardo: ${status}` });
      }
      return;
    }

    // 1. Encontrar o personagem associado a este ID de geração
    //    (Precisaremos adicionar um campo `generationJobId` ao modelo Character)
    const character = await Character.findOne({ where: { generationJobId: generationId } });

    if (!character) {
      console.error(`[WebhookService] Nenhum personagem encontrado para o generationId: ${generationId}`);
      return;
    }

    console.log(`[WebhookService] Processando imagem para o personagem ID: ${character.id}`);
    
    // 2. Baixar a imagem para o nosso servidor
    const remoteImageUrl = generated_images[0].url;
    const localGeneratedUrl = await downloadAndSaveImage(remoteImageUrl);

    // 3. Atualizar o personagem com a URL final e um nome melhor
    await character.update({
      generatedCharacterUrl: localGeneratedUrl,
      name: `Meu ${character.description.split(' ')[0] || 'Amigo'}`
    });

    console.log(`[WebhookService] Personagem ${character.id} atualizado com sucesso!`);
  }
}

module.exports = new WebhookService();