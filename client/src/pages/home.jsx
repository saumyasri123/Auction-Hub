import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuctionCard } from "@/components/auction-card";
import { Link } from "wouter";
import { Gavel, TrendingUp, Users, Clock } from "lucide-react";

export default function Home() {
  const { data: auctions = [], isLoading } = useQuery({
    queryKey: ["/api/auctions"],
  });

  const liveAuctions = auctions.filter((auction) => auction.status === "live");
  const scheduledAuctions = auctions.filter(
    (auction) => auction.status === "scheduled"
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-gray-200 rounded-lg h-80"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Real-Time Auction Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join live auctions, place bids in real-time, and win amazing items.
            Create your own auctions and reach thousands of potential buyers.
          </p>
          <div className="flex justify-center space-x-4">
            <Button asChild size="lg">
              <Link href="#auctions">Browse Auctions</Link>
            </Button>
            <Button variant="outline" asChild size="lg">
              <Link href="/create-auction">Create Auction</Link>
            </Button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-3">
                <Gavel className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {auctions.length}
              </h3>
              <p className="text-gray-600">Total Auctions</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-lg mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {liveAuctions.length}
              </h3>
              <p className="text-gray-600">Live Now</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-accent/10 rounded-lg mx-auto mb-3">
                <Clock className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {scheduledAuctions.length}
              </h3>
              <p className="text-gray-600">Starting Soon</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-destructive/10 rounded-lg mx-auto mb-3">
                <Users className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">1.2K+</h3>
              <p className="text-gray-600">Active Bidders</p>
            </CardContent>
          </Card>
        </div>

        {/* Live Auctions */}
        {liveAuctions.length > 0 && (
          <section className="mb-12" id="auctions">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Live Auctions</h2>
              <Badge className="bg-secondary text-secondary-foreground live-indicator">
                <span className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></span>
                {liveAuctions.length} Live Now
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveAuctions.map((auction) => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>
          </section>
        )}

        {/* Scheduled Auctions */}
        {scheduledAuctions.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Starting Soon</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scheduledAuctions.map((auction) => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>
          </section>
        )}

        {/* All Auctions */}
        {auctions.length > liveAuctions.length + scheduledAuctions.length && (
          <section className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">All Auctions</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {auctions.map((auction) => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>
          </section>
        )}

        {auctions.length === 0 && (
          <div className="text-center py-12">
            <Gavel className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Auctions Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Be the first to create an auction on our platform!
            </p>
            <Button asChild>
              <Link href="/create-auction">Create First Auction</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
