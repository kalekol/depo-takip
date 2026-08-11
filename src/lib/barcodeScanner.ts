import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  HTMLCanvasElementLuminanceSource,
  HybridBinarizer,
  GlobalHistogramBinarizer,
  BinaryBitmap,
} from '@zxing/library';

// Suppress ZXing's internal non-ReaderException console warnings globally
if (typeof window !== 'undefined' && console && console.warn) {
  const origWarn = console.warn;
  console.warn = function (...args: unknown[]) {
    if (
      args.length > 0 &&
      typeof args[0] === 'string' &&
      args[0].includes('MultiFormatReader: non-ReaderException')
    ) {
      return; // Silently filter out expected ZXing internal frame exception logs
    }
    origWarn.apply(console, args as [unknown, ...unknown[]]);
  };
}

// Configured ZXing Reader for fast multi-format barcode detection
const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.UPC_A,
  BarcodeFormat.EAN_8,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_93,
  BarcodeFormat.ITF,
  BarcodeFormat.CODABAR,
]);
hints.set(DecodeHintType.TRY_HARDER, false); // Fast continuous video scanning without blocking CPU

let zxingReader: BrowserMultiFormatReader | null = null;

export function getZXingReader(): BrowserMultiFormatReader {
  if (!zxingReader) {
    zxingReader = new BrowserMultiFormatReader(hints);
  }
  return zxingReader;
}

/**
 * Scan an uploaded image file for barcodes using Native BarcodeDetector or ZXing
 */
export async function scanBarcodeFromImageFile(file: File): Promise<string> {
  const imageUrl = URL.createObjectURL(file);
  try {
    // 1. Try Native BarcodeDetector (Browser / Mobile GPU accelerated)
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const BarcodeDetectorClass = (
          window as unknown as {
            BarcodeDetector: new (opts?: unknown) => {
              detect: (src: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
            };
          }
        ).BarcodeDetector;
        const detector = new BarcodeDetectorClass();
        const img = new Image();
        img.src = imageUrl;
        await img.decode();
        const detected = await detector.detect(img);
        if (detected && detected.length > 0 && detected[0].rawValue) {
          return detected[0].rawValue.trim();
        }
      } catch (e) {
        console.warn('Native BarcodeDetector image scan skipped, trying ZXing:', e);
      }
    }

    // 2. Fallback to ZXing reader
    const reader = getZXingReader();
    const result = await reader.decodeFromImageUrl(imageUrl);
    if (result && result.getText()) {
      return result.getText().trim();
    }
    throw new Error('Barkod bulunamadı');
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export interface CameraStreamControl {
  stream: MediaStream;
  stop: () => void;
  toggleFlash: (turnOn: boolean) => Promise<boolean>;
  hasFlash: boolean;
}

/**
 * Start direct HTML5 video stream.
 * NEVER lets any external library overwrite or stop videoElement.srcObject.
 * Decodes frames offscreen using Native BarcodeDetector & Dual-Binarizer ZXing.
 */
export async function startCameraStream(
  videoElement: HTMLVideoElement,
  onCodeScanned: (code: string) => void,
  cameraFacingMode: 'environment' | 'user' = 'environment',
  deviceId?: string
): Promise<CameraStreamControl> {
  let stream: MediaStream | null = null;

  const tryGetUserMedia = async (constraints: MediaStreamConstraints): Promise<MediaStream> => {
    return await navigator.mediaDevices.getUserMedia(constraints);
  };

  // Attempt 1: Exact Device ID if selected
  if (deviceId && deviceId !== 'environment' && deviceId !== 'user') {
    try {
      stream = await tryGetUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false,
      });
    } catch (e) {
      try {
        stream = await tryGetUserMedia({
          video: { deviceId: deviceId },
          audio: false,
        });
      } catch (e2) {
        // Fallback
      }
    }
  }

  // Attempt 2: Facing Mode constraint
  if (!stream) {
    try {
      stream = await tryGetUserMedia({
        video: {
          facingMode: { ideal: cameraFacingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch (e) {
      try {
        stream = await tryGetUserMedia({
          video: { facingMode: cameraFacingMode },
          audio: false,
        });
      } catch (e2) {
        // Fallback
      }
    }
  }

  // Attempt 3: Universal fallback
  if (!stream) {
    stream = await tryGetUserMedia({
      video: true,
      audio: false,
    });
  }

  if (!stream) {
    throw new Error('Kamera akışı başlatılamadı.');
  }

  // Attach stream to HTML5 video element
  videoElement.srcObject = stream;
  videoElement.setAttribute('playsinline', 'true');
  videoElement.playsInline = true;
  videoElement.muted = true;

  // Apply continuous focus if available on video track
  const videoTrack = stream.getVideoTracks()[0];
  if (videoTrack && videoTrack.applyConstraints) {
    try {
      await videoTrack.applyConstraints({
        advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
      });
    } catch (e) {
      // Continuous focus constraint ignored if unsupported
    }
  }

  // Wait for video metadata to load before playing
  await new Promise<void>((resolve) => {
    if (videoElement.readyState >= 1) {
      resolve();
    } else {
      const onMetadata = () => {
        videoElement.removeEventListener('loadedmetadata', onMetadata);
        resolve();
      };
      videoElement.addEventListener('loadedmetadata', onMetadata);
      setTimeout(resolve, 500);
    }
  });

  try {
    await videoElement.play();
  } catch (playErr) {
    await new Promise((r) => setTimeout(r, 150));
    await videoElement.play();
  }

  let isScanning = true;
  let isFrameProcessing = false;
  let lastScannedCode = '';
  let lastScannedTime = 0;
  let animationTimer: NodeJS.Timeout | null = null;
  let frameCounter = 0;

  const handleDetected = (code: string) => {
    if (!isScanning) return;
    const clean = code.trim();
    if (!clean) return;

    const now = Date.now();
    // Throttle duplicate scans within 1.2 seconds
    if (clean === lastScannedCode && now - lastScannedTime < 1200) {
      return;
    }
    lastScannedCode = clean;
    lastScannedTime = now;
    onCodeScanned(clean);
  };

  // Prepare Offscreen Canvases (Full Canvas + Cropped Region of Interest Canvas)
  const fullCanvas = document.createElement('canvas');
  const fullCtx = fullCanvas.getContext('2d', { willReadFrequently: true });

  const roiCanvas = document.createElement('canvas');
  const roiCtx = roiCanvas.getContext('2d', { willReadFrequently: true });

  // Native BarcodeDetector instance if supported in browser
  let nativeDetector: { detect: (src: CanvasImageSource) => Promise<Array<{ rawValue: string }>> } | null = null;
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const BarcodeDetectorClass = (
        window as unknown as {
          BarcodeDetector: new (opts?: unknown) => {
            detect: (src: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
          };
        }
      ).BarcodeDetector;
      nativeDetector = new BarcodeDetectorClass({
        formats: [
          'code_128',
          'ean_13',
          'code_39',
          'upc_a',
          'ean_8',
          'qr_code',
          'upc_e',
          'code_93',
          'itf',
          'codabar',
        ],
      });
    } catch (e) {
      // Native detector init ignored
    }
  }

  const reader = getZXingReader();

  // Helper function to run ZXing decoding with HybridBinarizer and GlobalHistogramBinarizer
  const tryZXingDecode = (targetCanvas: HTMLCanvasElement): string | null => {
    try {
      const luminanceSource = new HTMLCanvasElementLuminanceSource(targetCanvas);
      
      // 1. Try HybridBinarizer first
      try {
        const hybridBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
        const res = reader.decodeBitmap(hybridBitmap);
        if (res && res.getText()) {
          return res.getText();
        }
      } catch (e) {
        // HybridBinarizer NotFound Exception expected
      }

      // 2. Try GlobalHistogramBinarizer fallback (great for 1D linear barcodes)
      try {
        const globalBitmap = new BinaryBitmap(new GlobalHistogramBinarizer(luminanceSource));
        const res = reader.decodeBitmap(globalBitmap);
        if (res && res.getText()) {
          return res.getText();
        }
      } catch (e) {
        // GlobalHistogramBinarizer NotFound Exception expected
      }
    } catch (e) {
      // General ZXing canvas decode error ignored
    }
    return null;
  };

  // Continuous Frame Processing Loop
  const processNextFrame = async () => {
    if (!isScanning) return;

    if (
      videoElement &&
      videoElement.readyState >= 2 &&
      videoElement.videoWidth > 0 &&
      videoElement.videoHeight > 0
    ) {
      if (!isFrameProcessing) {
        isFrameProcessing = true;
        frameCounter++;
        try {
          const vWidth = videoElement.videoWidth;
          const vHeight = videoElement.videoHeight;

          // Crop parameters: 75% width, 55% height centered ROI box
          const cropW = Math.floor(vWidth * 0.75);
          const cropH = Math.floor(vHeight * 0.55);
          const cropX = Math.floor((vWidth - cropW) / 2);
          const cropY = Math.floor((vHeight - cropH) / 2);

          if (roiCanvas.width !== cropW || roiCanvas.height !== cropH) {
            roiCanvas.width = cropW;
            roiCanvas.height = cropH;
          }

          let detectedCode: string | null = null;

          if (roiCtx) {
            // Draw cropped center region onto ROI canvas
            roiCtx.drawImage(videoElement, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

            // 1. Try Native GPU BarcodeDetector on ROI canvas first
            if (nativeDetector) {
              try {
                const results = await nativeDetector.detect(roiCanvas);
                if (results && results.length > 0 && results[0].rawValue) {
                  detectedCode = results[0].rawValue;
                }
              } catch (e) {
                // Native detect error ignored
              }
            }

            // 2. Try ZXing engine on ROI canvas
            if (!detectedCode) {
              detectedCode = tryZXingDecode(roiCanvas);
            }
          }

          // 3. Fallback: Check full video canvas every 3 frames (~200ms) if ROI didn't catch
          if (!detectedCode && frameCounter % 3 === 0 && fullCtx) {
            if (fullCanvas.width !== vWidth || fullCanvas.height !== vHeight) {
              fullCanvas.width = vWidth;
              fullCanvas.height = vHeight;
            }
            fullCtx.drawImage(videoElement, 0, 0, vWidth, vHeight);

            if (nativeDetector) {
              try {
                const results = await nativeDetector.detect(fullCanvas);
                if (results && results.length > 0 && results[0].rawValue) {
                  detectedCode = results[0].rawValue;
                }
              } catch (e) {
                // Native detect error ignored
              }
            }

            if (!detectedCode) {
              detectedCode = tryZXingDecode(fullCanvas);
            }
          }

          if (detectedCode) {
            handleDetected(detectedCode);
          }
        } catch (err) {
          // Frame extraction error ignored
        } finally {
          isFrameProcessing = false;
        }
      }
    }

    if (isScanning) {
      // Schedule next frame check every 60ms (~16 FPS analysis rate)
      animationTimer = setTimeout(() => {
        requestAnimationFrame(processNextFrame);
      }, 60);
    }
  };

  // Start processing loop
  processNextFrame();

  // Flash / Torch control
  const capabilities = videoTrack ? (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) : {};
  const hasFlash = Boolean(capabilities && (capabilities as { torch?: boolean }).torch);

  const toggleFlash = async (turnOn: boolean): Promise<boolean> => {
    if (!videoTrack || !hasFlash) return false;
    try {
      await videoTrack.applyConstraints({
        advanced: [{ torch: turnOn } as MediaTrackConstraintSet],
      });
      return true;
    } catch (e) {
      return false;
    }
  };

  const stop = () => {
    isScanning = false;
    if (animationTimer) {
      clearTimeout(animationTimer);
      animationTimer = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => {
        try { track.stop(); } catch (e) { /* ignore */ }
      });
    }
    if (videoElement) {
      videoElement.srcObject = null;
    }
  };

  return {
    stream,
    stop,
    toggleFlash,
    hasFlash,
  };
}

/**
 * Enumerate camera devices with label and ID
 */
export async function getCameraDevices(): Promise<{ id: string; label: string }[]> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return [];
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'videoinput')
      .map((d, index) => ({
        id: d.deviceId,
        label: d.label || `Kamera ${index + 1}`,
      }));
  } catch (e) {
    return [];
  }
}
