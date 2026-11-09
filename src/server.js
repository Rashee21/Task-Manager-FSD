const app = require('./app');
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Task Manager API listening on http://localhost:' + PORT);
  console.log('Health check: http://localhost:' + PORT + '/health');
});
