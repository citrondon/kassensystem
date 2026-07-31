import { Composition } from "remotion";
import { Promo, PROMO_DURATION } from "./Promo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Mon Comptoir Werbevideo – 9:16 Hochformat für Handys, 42,5 s */}
      <Composition
        id="Promo"
        component={Promo}
        durationInFrames={PROMO_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
