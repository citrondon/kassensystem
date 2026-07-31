import {
  AbsoluteFill,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "./Background";
import { SceneTitle } from "./SceneTitle";
import { colors } from "../theme";

export interface ClipSegment {
  src: string;
  /** Start/Ende im Quellvideo (Frames bei 30 fps) */
  startFrom: number;
  endAt: number;
  playbackRate: number;
}

interface Props {
  title: string;
  highlight?: string;
  segments: ClipSegment[];
}

/** Phone-Rahmen um die echte App-Aufnahme (430x900 Quelle). */
const FRAME_WIDTH = 692;
const VIDEO_WIDTH = 660;
const VIDEO_HEIGHT = Math.round((VIDEO_WIDTH / 430) * 900); // ~1381

export const LiveAppScene: React.FC<Props> = ({ title, highlight, segments }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    delay: 4,
    config: { damping: 15, stiffness: 95 },
  });
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.05], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Background>
      <AbsoluteFill style={{ padding: 80, alignItems: "center" }}>
        <div style={{ marginTop: 100, marginBottom: 56 }}>
          <SceneTitle title={title} highlight={highlight} />
        </div>
        <div
          style={{
            width: FRAME_WIDTH,
            borderRadius: 64,
            background: colors.text,
            padding: 16,
            boxShadow:
              "0 40px 90px rgba(28, 25, 23, 0.28), 0 8px 24px rgba(28, 25, 23, 0.18)",
            opacity: entrance,
            transform: `translateY(${interpolate(entrance, [0, 1], [90, 0])}px) scale(${interpolate(entrance, [0, 1], [0.92, 1])})`,
          }}
        >
          <div
            style={{
              width: VIDEO_WIDTH,
              height: VIDEO_HEIGHT,
              borderRadius: 50,
              overflow: "hidden",
              position: "relative",
              background: "#FFFFFF",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                transform: `scale(${zoom})`,
                transformOrigin: "center 30%",
              }}
            >
              {(() => {
                let offset = 0;
                return segments.map((seg, i) => {
                  const segFrames = Math.round(
                    (seg.endAt - seg.startFrom) / seg.playbackRate,
                  );
                  const from = offset;
                  offset += segFrames;
                  return (
                    <Sequence
                      key={seg.src + i}
                      from={from}
                      durationInFrames={segFrames}
                    >
                      <OffthreadVideo
                        src={staticFile(seg.src)}
                        startFrom={seg.startFrom}
                        endAt={seg.endAt}
                        playbackRate={seg.playbackRate}
                        muted
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </Sequence>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </Background>
  );
};
