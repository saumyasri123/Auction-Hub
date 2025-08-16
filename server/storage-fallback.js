import { nanoid } from "nanoid";

// In-memory storage fallback for development
export class MemoryStorage {
  users = new Map();
  auctions = new Map();
  bids = new Map();
  notifications = new Map();
  counterOffers = new Map();
  invoices = new Map();

  constructor() {
    console.log("🔄 Using in-memory storage fallback");
    this.seedData();
  }

  seedData() {
    // Create demo users
    const sellerId = nanoid();
    const buyerId1 = nanoid();
    const buyerId2 = nanoid();

    const seller = {
      id: sellerId,
      email: "seller@demo.com",
      passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456", // demo password
      firstName: "John",
      lastName: "Seller",
      role: "seller",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const buyer1 = {
      id: buyerId1,
      email: "buyer1@demo.com",
      passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
      firstName: "Alice",
      lastName: "Buyer",
      role: "buyer",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const buyer2 = {
      id: buyerId2,
      email: "buyer2@demo.com",
      passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
      firstName: "Bob",
      lastName: "Collector",
      role: "buyer",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(sellerId, seller);
    this.users.set(buyerId1, buyer1);
    this.users.set(buyerId2, buyer2);

    // Create demo auctions
    const auctionId1 = nanoid();
    const auctionId2 = nanoid();

    const auction1 = {
      id: auctionId1,
      sellerId,
      title: "Vintage Antique Vase",
      description:
        "Beautiful hand-crafted ceramic vase from the 1920s. Perfect condition with original glaze.",
      startingPrice: 50.0,
      reservePrice: 100.0,
      currentPrice: 75.0,
      imageUrl:
        "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400",
      startTime: new Date(Date.now() + 30000), // Starts in 30 seconds
      endTime: new Date(Date.now() + 300000), // Ends in 5 minutes
      status: "scheduled",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const auction2 = {
      id: auctionId2,
      sellerId,
      title: "Rare Book Collection",
      description:
        "First edition novels from famous authors. Includes signed copies.",
      startingPrice: 200.0,
      reservePrice: 500.0,
      currentPrice: 250.0,
      imageUrl:
        "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400",
      startTime: new Date(Date.now() - 60000), // Started 1 minute ago
      endTime: new Date(Date.now() + 240000), // Ends in 4 minutes
      status: "live",
      createdAt: new Date(Date.now() - 120000),
      updatedAt: new Date(),
    };

    this.auctions.set(auctionId1, auction1);
    this.auctions.set(auctionId2, auction2);

    // Create demo bids
    const bidId1 = nanoid();
    const bidId2 = nanoid();

    const bid1 = {
      id: bidId1,
      auctionId: auctionId2,
      bidderId: buyerId1,
      amount: 250.0,
      createdAt: new Date(Date.now() - 60000),
    };

    const bid2 = {
      id: bidId2,
      auctionId: auctionId2,
      bidderId: buyerId2,
      amount: 275.0,
      createdAt: new Date(Date.now() - 30000),
    };

    this.bids.set(bidId1, bid1);
    this.bids.set(bidId2, bid2);

    // Update auction with highest bid
    auction2.currentPrice = 275.0;
    auction2.highestBidId = bidId2;

    console.log("📊 Demo data loaded: 3 users, 2 auctions, 2 bids");
  }

  async getUser(id) {
    return this.users.get(id);
  }

  async getUserByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return undefined;
  }

  async createUser(user) {
    const newUser = {
      id: nanoid(),
      ...user,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  async getUsers() {
    return Array.from(this.users.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async getAuctions(status) {
    const allAuctions = Array.from(this.auctions.values());
    if (status) {
      return allAuctions.filter((a) => a.status === status);
    }
    return allAuctions.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async getAuction(id) {
    return this.auctions.get(id);
  }

  async createAuction(auction) {
    const newAuction = {
      id: nanoid(),
      ...auction,
      currentPrice: auction.startingPrice,
      status: "scheduled",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.auctions.set(newAuction.id, newAuction);
    return newAuction;
  }

  async updateAuctionStatus(id, status, highestBidId) {
    const auction = this.auctions.get(id);
    if (auction) {
      auction.status = status;
      auction.updatedAt = new Date();
      if (highestBidId) {
        auction.highestBidId = highestBidId;
      }
      this.auctions.set(id, auction);
    }
  }

  async getBidsForAuction(auctionId, limit = 10) {
    const auctionBids = Array.from(this.bids.values())
      .filter((bid) => bid.auctionId === auctionId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
    return auctionBids;
  }

  async getHighestBid(auctionId) {
    const auctionBids = Array.from(this.bids.values())
      .filter((bid) => bid.auctionId === auctionId)
      .sort((a, b) => b.amount - a.amount);
    return auctionBids[0];
  }

  async createBid(bid) {
    const newBid = {
      id: nanoid(),
      ...bid,
      createdAt: new Date(),
    };
    this.bids.set(newBid.id, newBid);

    // Update auction current price and highest bid
    const auction = this.auctions.get(bid.auctionId);
    if (auction && Number(bid.amount) > Number(auction.currentPrice)) {
      auction.currentPrice = Number(bid.amount);
      auction.highestBidId = newBid.id;
      auction.updatedAt = new Date();
      this.auctions.set(auction.id, auction);
    }

    return newBid;
  }

  async getNotificationsForUser(userId) {
    return Array.from(this.notifications.values())
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createNotification(notification) {
    const newNotification = {
      id: nanoid(),
      ...notification,
      createdAt: new Date(),
    };
    this.notifications.set(newNotification.id, newNotification);
    return newNotification;
  }

  async markNotificationRead(id) {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.readAt = new Date();
      this.notifications.set(id, notification);
    }
  }

  async getCounterOffer(auctionId) {
    for (const offer of this.counterOffers.values()) {
      if (offer.auctionId === auctionId) return offer;
    }
    return undefined;
  }

  async createCounterOffer(counterOffer) {
    const newCounterOffer = {
      id: nanoid(),
      ...counterOffer,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.counterOffers.set(newCounterOffer.id, newCounterOffer);
    return newCounterOffer;
  }

  async updateCounterOfferStatus(id, status) {
    const counterOffer = this.counterOffers.get(id);
    if (counterOffer) {
      counterOffer.status = status;
      counterOffer.updatedAt = new Date();
      this.counterOffers.set(id, counterOffer);
    }
  }

  async createInvoice(invoice) {
    const newInvoice = {
      id: nanoid(),
      ...invoice,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.invoices.set(newInvoice.id, newInvoice);
    return newInvoice;
  }

  async getInvoice(auctionId) {
    for (const invoice of this.invoices.values()) {
      if (invoice.auctionId === auctionId) return invoice;
    }
    return undefined;
  }
}
