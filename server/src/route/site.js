const showtimeRouter = require('./showtime');
const ticketRouter = require('./ticket');
const movieRouter = require('./movie');

function route(app) {
  app.use('/showtime', showtimeRouter);
  app.use('/ticket', ticketRouter);
  app.use('/movies', movieRouter);
}

module.exports = route;
