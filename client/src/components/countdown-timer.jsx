import { useState, useEffect } from "react";

export function CountdownTimer({ endTime, onExpire }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const difference = end - now;

      if (difference <= 0) {
        if (!isExpired) {
          setIsExpired(true);
          onExpire?.();
        }
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      return { days, hours, minutes, seconds };
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, [endTime, isExpired, onExpire]);

  if (isExpired) {
    return (
      <div className="bg-destructive text-destructive-foreground p-6 rounded-lg">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Auction Ended</h3>
          <p className="text-sm opacity-75">This auction has concluded</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-primary to-blue-600 text-white p-6 rounded-lg">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Auction Ends In</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="countdown-number">{timeLeft.days.toString().padStart(2, "0")}</div>
            <div className="text-xs opacity-75">DAYS</div>
          </div>
          <div>
            <div className="countdown-number">{timeLeft.hours.toString().padStart(2, "0")}</div>
            <div className="text-xs opacity-75">HOURS</div>
          </div>
          <div>
            <div className="countdown-number">{timeLeft.minutes.toString().padStart(2, "0")}</div>
            <div className="text-xs opacity-75">MINS</div>
          </div>
          <div>
            <div className="countdown-number">{timeLeft.seconds.toString().padStart(2, "0")}</div>
            <div className="text-xs opacity-75">SECS</div>
          </div>
        </div>
      </div>
    </div>
  );
}
