export class ClientVocalRemover {
  constructor(audioElement) {
    this.audioElement = audioElement;
    this.audioCtx = null;
    this.source = null;
    this.splitter = null;
    this.merger = null;
    this.inverter = null;
    this.bypassGain = null;
    this.filterNode = null;
    this.isEnabled = false;
  }

  init() {
    if (this.audioCtx) return;

    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.source = this.audioCtx.createMediaElementSource(this.audioElement);
      
      // Nodes for Vocal Cancellation
      this.splitter = this.audioCtx.createChannelSplitter(2);
      this.merger = this.audioCtx.createChannelMerger(2);
      this.inverter = this.audioCtx.createGain();
      this.inverter.gain.value = -1.0;

      // Bandpass/Bandstop filter to further isolate vocal ranges (typically 300Hz to 3400Hz)
      // and attenuate them, preserving bass and high-end frequencies
      this.filterNode = this.audioCtx.createBiquadFilter();
      this.filterNode.type = 'peaking';
      this.filterNode.frequency.value = 1000; // Center frequency of vocals
      this.filterNode.Q.value = 1.0; // Vocal bandwidth
      this.filterNode.gain.value = -12; // Attenuate vocal frequencies

      // Node for normal path (bypass)
      this.bypassGain = this.audioCtx.createGain();
      this.bypassGain.gain.value = 1.0;

      // Connections:
      // 1. Bypass chain: Source -> bypassGain -> Destination (Initially active)
      this.source.connect(this.bypassGain);
      this.bypassGain.connect(this.audioCtx.destination);

      // 2. Center-cancel vocal removal chain:
      // Source -> splitter
      this.source.connect(this.splitter);
      
      // Left channel goes straight to both Left/Right input of merger
      this.splitter.connect(this.merger, 0, 0); // L -> L
      this.splitter.connect(this.merger, 0, 1); // L -> R
      
      // Right channel goes to inverter, then inverter output is summed to merger inputs
      this.splitter.connect(this.inverter, 1);
      this.inverter.connect(this.merger, 0, 0); // -R -> L (result: L - R)
      this.inverter.connect(this.merger, 0, 1); // -R -> R (result: L - R)
      
      // We route the center-canceled signal through the peaking filter to reduce mid-range vocal power
      this.merger.connect(this.filterNode);
      
      console.log('Web Audio API Vocal Remover initialized successfully.');
    } catch (err) {
      console.error('Failed to initialize Web Audio API Vocal Remover:', err);
    }
  }

  setTuneMode(enabled) {
    if (!this.audioCtx) {
      this.init();
    }
    
    if (!this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    if (this.isEnabled === enabled) return;
    this.isEnabled = enabled;

    if (enabled) {
      // Disconnect normal path
      this.bypassGain.disconnect();
      // Connect filter path to destination
      this.filterNode.connect(this.audioCtx.destination);
      console.log('Client-side Tune Mode (Vocal Attenuator) ACTIVE.');
    } else {
      // Disconnect filter path
      this.filterNode.disconnect();
      // Connect normal path to destination
      this.bypassGain.connect(this.audioCtx.destination);
      console.log('Client-side Tune Mode (Vocal Attenuator) INACTIVE.');
    }
  }
}
