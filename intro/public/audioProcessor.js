class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.isRecording = true;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (input.length > 0) {
      const inputChannel = input[0];
      const outputChannel = output[0];
      
      // Copy input to output for monitoring
      for (let i = 0; i < inputChannel.length; i++) {
        outputChannel[i] = inputChannel[i];
      }
      
      // Send audio data to main thread
      this.port.postMessage({
        type: 'audioData',
        data: inputChannel.slice()
      });
    }
    
    return this.isRecording;
  }
}

registerProcessor('audio-processor', AudioProcessor); 