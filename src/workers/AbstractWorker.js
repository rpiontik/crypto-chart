class AbstractWorker {
  constructor () {
    this.methods = [];
  }
  addMethod (method) {
    let wtf = importScripts(method);
    console.log(wtf, method, this, self, testFunc);
  }
  messageHandler (message) {
    switch (message.data.task) {
      case 'addMethod': {
        this.addMethod(message.data.data);
        break;
      }
      default: break;
    }
  }
}

let worker = new AbstractWorker();

onmessage = (data) => {
  worker.messageHandler(data);
};