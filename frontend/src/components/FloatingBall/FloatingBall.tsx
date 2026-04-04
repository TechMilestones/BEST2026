import "./FloatingBall.css"

type Props = {
  onClick?: () => void;
};

export default function FloatingBall({ onClick }: Props) {
  return (
    <div className="floating-ball" onClick={onClick}>
      <div className="floating-ball_icon">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
}

