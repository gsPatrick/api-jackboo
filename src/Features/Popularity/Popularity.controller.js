const popularityService = require('./Popularity.service');

class PopularityController {
  async toggleLike(req, res) {
    try {
      const { likableType, likableId } = req.params; // Virão da URL
      const userId = req.user.id; // Do token JWT
      
      const result = await popularityService.toggleLike(userId, likableType, likableId);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getLikesCount(req, res) {
    try {
      const { likableType, likableId } = req.params;
      const count = await popularityService.getLikesCount(likableType, likableId);
      const userLiked = req.user ? await popularityService.userLiked(req.user.id, likableType, likableId) : false;
      res.status(200).json({ totalLikes: count, userLiked });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = new PopularityController();