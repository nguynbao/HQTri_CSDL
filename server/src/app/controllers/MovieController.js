const Movie = require('../models/Movie');

class MovieController {
  // [GET] /movies
  list(req, res) {
    Movie.find({})
      .then((movies) => res.json(movies))
      .catch((err) => res.status(500).json(err));
  }
}

module.exports = new MovieController();
