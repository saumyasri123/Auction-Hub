import { redisService } from './redis.js';
import { EmailService } from './email.js';
import { getStorage } from '../storage.js';

export class AuctionService {
  static activeTimers = new Map();

  static async initializeAuctionTimers() {
    try {
      // Load all scheduled and live auctions
      const storage = await getStorage();
      const scheduledAuctions = await storage.getAuctions('scheduled');
      const liveAuctions = await storage.getAuctions('live');

    for (const auction of scheduledAuctions) {
      this.scheduleAuctionStart(auction);
    }

      for (const auction of liveAuctions) {
        this.scheduleAuctionEnd(auction);
      }
      
      console.log(`✅ Initialized ${scheduledAuctions.length} scheduled and ${liveAuctions.length} live auction timers`);
    } catch (error) {
      console.warn('⚠️ Failed to initialize auction timers:', error.message);
      console.log('Application will continue without auction timer initialization');
    }
  }

  static scheduleAuctionStart(auction) {
    const startTime = new Date(auction.goLiveAt).getTime();
    const now = Date.now();
    const delay = startTime - now;

    if (delay > 0) {
      const timer = setTimeout(() => {
        this.startAuction(auction.id);
      }, delay);

      this.activeTimers.set(`start-${auction.id}`, timer);
    } else if (delay > -60000) { // Start if less than 1 minute late
      this.startAuction(auction.id);
    }
  }

  static scheduleAuctionEnd(auction) {
    const endTime = new Date(auction.goLiveAt).getTime() + (auction.durationMinutes * 60 * 1000);
    const now = Date.now();
    const delay = endTime - now;

    if (delay > 0) {
      const timer = setTimeout(() => {
        this.endAuction(auction.id);
      }, delay);

      this.activeTimers.set(`end-${auction.id}`, timer);
    } else {
      this.endAuction(auction.id);
    }
  }

  static async startAuction(auctionId) {
    const storage = await getStorage();
    await storage.updateAuctionStatus(auctionId, 'live');
    await redisService.setAuctionState(auctionId, { status: 'live' });
    
    const auction = await storage.getAuction(auctionId);
    if (auction) {
      this.scheduleAuctionEnd(auction);
      
      // Broadcast auction started
      if (global.io) {
        global.io.to(`auction:${auctionId}`).emit('auction_started', {
          auctionId,
          endsAt: new Date(new Date(auction.goLiveAt).getTime() + (auction.durationMinutes * 60 * 1000))
        });
      }
    }

    this.activeTimers.delete(`start-${auctionId}`);
  }

  static async endAuction(auctionId) {
    const storage = await getStorage();
    await storage.updateAuctionStatus(auctionId, 'ended');
    await redisService.setAuctionState(auctionId, { status: 'ended' });
    
    const auction = await storage.getAuction(auctionId);
    const highestBid = await storage.getHighestBid(auctionId);
    
    if (auction && highestBid) {
      // Notify seller and highest bidder
      const seller = await storage.getUser(auction.sellerId);
      const buyer = await storage.getUser(highestBid.bidderId);
      
      if (seller && buyer) {
        await EmailService.sendAuctionWinNotification(buyer.email, auction.itemName, highestBid.amount);
        await EmailService.sendSellerNotification(seller.email, auction.itemName, highestBid.amount);
        
        // Create notifications
        await storage.createNotification({
          userId: seller.id,
          type: 'auction_ended',
          message: `Your auction for "${auction.itemName}" has ended. Please review the highest bid.`,
          meta: { auctionId, highestBid: highestBid.amount }
        });
        
        await storage.createNotification({
          userId: buyer.id,
          type: 'auction_won',
          message: `Congratulations! You won the auction for "${auction.itemName}" with a bid of $${highestBid.amount}.`,
          meta: { auctionId, winningBid: highestBid.amount }
        });
      }

      // Broadcast auction ended
      if (global.io) {
        global.io.to(`auction:${auctionId}`).emit('auction_ended', {
          auctionId,
          highestBid: {
            id: highestBid.id,
            amount: highestBid.amount,
            bidderId: highestBid.bidderId
          }
        });
      }
    }

    this.activeTimers.delete(`end-${auctionId}`);
  }

  static clearTimer(auctionId, type) {
    const key = `${type}-${auctionId}`;
    if (this.activeTimers.has(key)) {
      clearTimeout(this.activeTimers.get(key));
      this.activeTimers.delete(key);
    }
  }
}
