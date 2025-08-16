import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Gavel, Users } from "lucide-react";
import { Link } from "wouter";

export function AuctionCard({ auction, currentBid, bidCount = 0 }) {
  const getStatusBadge = (status) => {
    switch (status) {
      case "live":
        return (
          <Badge className="bg-secondary text-secondary-foreground live-indicator">
            Live
          </Badge>
        );
      case "scheduled":
        return <Badge variant="outline">Scheduled</Badge>;
      case "ended":
        return <Badge variant="secondary">Ended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTimeDisplay = () => {
    const startTime = new Date(auction.goLiveAt);
    const endTime = new Date(
      startTime.getTime() + auction.durationMinutes * 60 * 1000
    );
    const now = new Date();

    if (auction.status === "live") {
      const timeLeft = endTime.getTime() - now.getTime();
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor(
        (timeLeft % (1000 * 60 * 60)) / (1000 * 60)
      );
      return `${hours}h ${minutes}m left`;
    } else if (auction.status === "scheduled") {
      return `Starts ${startTime.toLocaleDateString()}`;
    } else {
      return "Ended";
    }
  };

  return (
    <Card className="auction-card-hover overflow-hidden">
      <div className="aspect-video bg-gray-100 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <Gavel className="w-16 h-16 text-gray-400" />
        </div>
      </div>

      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          {getStatusBadge(auction.status)}
          <span className="text-sm text-gray-500 flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {getTimeDisplay()}
          </span>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
          {auction.itemName}
        </h3>

        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {auction.description}
        </p>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Current Bid:</span>
            <span className="text-lg font-bold text-secondary">
              $
              {currentBid
                ? parseFloat(currentBid.amount).toLocaleString()
                : parseFloat(auction.startingPrice).toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Starting Price:</span>
            <span className="text-sm text-gray-700">
              ${parseFloat(auction.startingPrice).toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Bids:</span>
            <span className="text-sm text-gray-700 flex items-center">
              <Users className="w-4 h-4 mr-1" />
              {bidCount}
            </span>
          </div>
        </div>

        <Link href={`/auction/${auction.id}`}>
          <Button className="w-full mt-4">View & Bid</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
