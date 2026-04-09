const EventEmitter = require('events');

class AppEmitter extends EventEmitter {}

// Export a single instance to be shared across the application
const eventEmitter = new AppEmitter();

module.exports = eventEmitter;
