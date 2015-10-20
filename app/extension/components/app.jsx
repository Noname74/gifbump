import 'styles/extensions.scss'

import React 	from 'react'
import ReactDOM from 'react-dom'
import { GIF } from 'gif.js'

// Shim getUserMedia
navigator.getUserMedia  = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia

// Create canvas and context
const canvas = document.createElement('canvas'),
      ctx    = canvas.getContext('2d')

// Constants
const DARK_TRESHOLD  = 130,
  MIN_DARK_RATIO = 0.8,
  FRAME_RATE     = 1000 / 15,
  PASSIVE_FETCH_INTERVAL = FRAME_RATE * 5,
  BUMP_DELAY     = FRAME_RATE * 3

const videoSettings = {
  video: {
    mandatory: {
      maxWidth: 640,
      maxHeight: 360
    }
  }
}

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    // Get user media, or ask for permissions
    navigator.getUserMedia(videoSettings , stream => {
      this.setState({
        access: true
      });

      // Get rendered video element
      this.video = ReactDOM.findDOMNode(this).getElementsByTagName('video')[0];
      this.video.src = window.URL.createObjectURL(stream);

      this.video.onloadedmetadata = e => {
        canvas.width = this.video.clientWidth;
        canvas.height = this.video.clientHeight;
        this.passiveTimer =  window.setInterval(() => {
          ctx.drawImage(this.video, 0, 0);
          if (this.checkIfBlack())
            window.setTimeout(() => this.triggerRecording(), 3000)
        }, PASSIVE_FETCH_INTERVAL);
      };

      this.localMediaStream = stream
    }, e => {
      this.setState({
        access: false
      })
    })
    this.renderElements()
  }

  renderElements() {
    this.errorCover = (
      <div>
        <img src="icon.png" />
        <span className="error">
          <br/>
          <span>GIF ME ACCESS!</span>
          <br/><br/>
          <span><small>
            We need to access your camera for bumping action, go to &nbsp;
            <span className="link" onClick={ e => this.openOptions(e) }>options</span>
            &nbsp; to enable camera access
          </small></span>
        </span>
      </div>
    );
    this.inactiveCover = (
      <div>
        <img src="icon.png" onClick={e => this.triggerRecording()} />
        <h2>
          BUMP TO <small>(GIF)</small>BUMP!
        </h2>
      </div>
    );
    this.activeCover = (
      <div>
        <h2>We'll be recording</h2>
      </div>
    );
  }

  screenShot() {
    if (this.localMediaStream) {
      ctx.drawImage(this.video, 0, 0);
      if (!this.checkIfBlack())
        this.gif.addFrame(ctx, {copy: true, delay: FRAME_RATE});
      else
        window.setTimeout(e => this.stopRecording(), BUMP_DELAY)
    }
  }

  checkIfBlack() {
    let count = 0,
      dark = 0,
      cur,
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    for (var i=0; i < canvas.width; i+=40) {
      for (var j=0; i < canvas.height; i+=40) {
        count++;
        cur = (j * canvas.width + i) * 4;
        // (R + G + B)
        if (imageData[cur] + imageData[cur+1] + imageData[cur+2] < DARK_TRESHOLD) dark++
      }
    }
    let result = (dark/count > MIN_DARK_RATIO);
    return result;
  }

  upload(file) {

    // file is from a <input> tag or from Drag'n Drop
    // Is the file an image?

    if (!file || !file.type.match(/image.*/)) return;

    // It is!
    // Let's build a FormData object

    var fd = new FormData();
    fd.append("image", file); // Append the file
    fd.append("key", "6528448c258cff474ca9701c5bab6927");
    // Get your own key: http://api.imgur.com/

    // Create the XHR (Cross-Domain XHR FTW!!!)
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "http://api.imgur.com/2/upload.json"); // Boooom!
    xhr.onload = () => {
      // Big win!
      // The URL of the image is:
      const link = JSON.parse(xhr.responseText).upload.links.original;
      console.log(link);
      this.copyToClipboard(link)
    }
    // Ok, I don't handle the errors. An exercice for the reader.
    // And now, we send the formdata
    xhr.send(fd);
  }

  toggleRecording() {
    if (!this.timer) {
      this.gif = new GIF({
        workers: 4,
        quality: 10,
        width: this.video.clientWidth,
        height: this.video.clientHeight
      });

      this.gif.on('finished', blob => {
        document.querySelector('.le-img').src = URL.createObjectURL(blob);
        blob = this.blobToFile(blob);
        this.upload(blob);
      });

      this.timer = window.setInterval(e => this.screenShot(), FRAME_RATE);
    } else this.stopRecording();

  }

  blobToFile(theBlob, fileName){
    /* A Blob() is almost a File() - it's just missing the two properties below which we will add */
    theBlob.lastModifiedDate = new Date();
    theBlob.name = fileName;
    return theBlob;
  }

  stopRecording() {
    window.clearInterval(this.timer);
    this.timer = null;
    this.gif.render();
  }

  openOptions() {
    console.log('WHAAKLSJLAKJS');
    chrome.tabs.create({url: 'options.html'});
  }

  triggerRecording() {
    window.clearInterval(this.passiveTimer);
    if (this.state.access) {
      this.setState({recording: true});
      this.toggleRecording();
    }
  }

  copyToClipboard(text) {
    const input = document.createElement('input');
    input.style.position = 'fixed';
    input.style.opacity = 0;
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('Copy');
    document.body.removeChild(input);
  }

  render() {
    let successCover = (this.state.recording ? this.activeCover : this.inactiveCover);

    return(
      <div className="app flicker scanlines">
        <video autoPlay />
        <div className="cover">
          {(this.state.access) ? successCover : this.errorCover}
        </div>
        <img className="le-img" alt="" src=""/>
      </div>
    )
  }
}
