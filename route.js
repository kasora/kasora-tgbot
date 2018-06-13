let service = require('./service');

exports = module.exports = {
  echo: {
    handler: service.echo
  },
  bash: {
    handler: service.bash
  },
  node: {
    handler: service.node
  },
  id: {
    handler: service.id
  },
  shutup: {
    handler: service.shutUp
  }
};
