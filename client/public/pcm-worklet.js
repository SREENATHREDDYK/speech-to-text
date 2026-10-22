const TARGET_RATE = 16000;
const CHUNK_SAMPLES = 1600;

class PcmWorklet extends AudioWorkletProcessor {
    constructor() {
        super();
        this.ratio = sampleRate / TARGET_RATE;
        this.position = 0;
        this.sum = 0;
        this.count = 0;
        this.chunk = new Int16Array(CHUNK_SAMPLES);
        this.chunkLength = 0;
    }

    process(inputs) {
        const channel = inputs[0][0];
        if (!channel) return true;

        for (let i = 0; i < channel.length; i++) {
            this.sum += channel[i];
            this.count++;
            this.position++;

            if (this.position >= this.ratio) {
                this.position -= this.ratio;
                this.addSample(this.sum / this.count);
                this.sum = 0;
                this.count = 0;
            }
        }

        return true;
    }

    addSample(value) {
        const clamped = Math.max(-1, Math.min(1, value));
        this.chunk[this.chunkLength++] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;

        if (this.chunkLength === CHUNK_SAMPLES) {
            this.port.postMessage(this.chunk.buffer, [this.chunk.buffer]);
            this.chunk = new Int16Array(CHUNK_SAMPLES);
            this.chunkLength = 0;
        }
    }
}

registerProcessor('pcm-worklet', PcmWorklet);
