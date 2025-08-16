import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, desc } from "drizzle-orm";

dotenv.config();
import {
  users,
  auctions,
  bids,
  notifications,
  counterOffers,
  invoices,
} from "../shared/schema.js";

// URL encode the password if it contains special characters
let db;
let isConnected = false;

try {
  const databaseUrl = process.env.DATABASE_URL || "";

  // Debug logging
  console.log("DATABASE_URL environment variable:", process.env.DATABASE_URL ? "SET" : "NOT SET");
  console.log("Database URL length:", databaseUrl.length);
  console.log("Database URL preview:", databaseUrl.substring(0, 50) + "...");

  // Add detailed error handling
  console.log("Attempting to connect to database...");
  try {
    const pool = new Pool({
      connectionString: databaseUrl,
    });
    console.log("Successfully created pg pool");
    db = drizzle(pool);
    console.log("Successfully created drizzle connection");
  } catch (error) {
    console.error("Database connection error:", error.message);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
    throw error;
  }
  isConnected = true;
  console.log("✅ Database connection initialized");
} catch (error) {
  console.warn(
    "⚠️ Database connection failed, using fallback:",
    (error && error.message) || error
  );
  isConnected = false;
}

export class DatabaseStorage {
  async getUser(id) {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email) {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(user) {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async getUsers() {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getAuctions(status) {
    if (status) {
      return await db
        .select()
        .from(auctions)
        .where(eq(auctions.status, status))
        .orderBy(desc(auctions.createdAt));
    }
    return await db.select().from(auctions).orderBy(desc(auctions.createdAt));
  }

  async getAuction(id) {
    const result = await db
      .select()
      .from(auctions)
      .where(eq(auctions.id, id))
      .limit(1);
    return result[0];
  }

  async createAuction(auction) {
    const row = {
      itemName: (auction.itemName ?? "").toString().trim(),     // -> item_name
      description: (auction.description ?? "").toString().trim(),
      startingPrice: auction.startingPrice != null ? Number(auction.startingPrice) : 0,
      bidIncrement: auction.bidIncrement != null ? Number(auction.bidIncrement) : 1,
      durationMinutes: auction.durationMinutes != null ? Number(auction.durationMinutes) : 60,

      // 👇 IMPORTANT: your DB expects go_live_at, so Drizzle expects goLiveAt
      goLiveAt: (() => {
        const src = auction.goLiveAt ?? auction.startTime; // accept either name from client
        return src ? new Date(src) : new Date();           // ensure NOT NULL
      })(),

      // never let status be null
      status: auction.status ?? "scheduled",

      // optional
      reservePrice: auction.reservePrice != null ? Number(auction.reservePrice) : null,
      imageUrl: auction.imageUrl ?? null,
      images: auction.images ?? null,
      sellerId: auction.sellerId ?? auction.userId ?? null,
    };

    console.log("[createAuction] inserting row:", row);

    const result = await db.insert(auctions).values(row).returning();
    return result[0];
  }

  async updateAuctionStatus(id, status, highestBidId) {
    const updateData = { status, updatedAt: new Date() };
    if (highestBidId) {
      updateData.highestBidId = highestBidId;
    }
    await db.update(auctions).set(updateData).where(eq(auctions.id, id));
  }

  async getBidsForAuction(auctionId, limit = 10) {
    return await db
      .select()
      .from(bids)
      .where(eq(bids.auctionId, auctionId))
      .orderBy(desc(bids.createdAt))
      .limit(limit);
  }

  async getHighestBid(auctionId) {
    const result = await db
      .select()
      .from(bids)
      .where(eq(bids.auctionId, auctionId))
      .orderBy(desc(bids.amount))
      .limit(1);
    return result[0];
  }

  async createBid(bid) {
    const result = await db.insert(bids).values(bid).returning();
    return result[0];
  }

  async getNotificationsForUser(userId) {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification) {
    const result = await db.insert(notifications).values(notification).returning();
    return result[0];
  }

  async markNotificationRead(id) {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(eq(notifications.id, id));
  }

  async getCounterOffer(auctionId) {
    const result = await db
      .select()
      .from(counterOffers)
      .where(eq(counterOffers.auctionId, auctionId))
      .limit(1);
    return result[0];
  }

  async createCounterOffer(counterOffer) {
    const result = await db.insert(counterOffers).values(counterOffer).returning();
    return result[0];
  }

  async updateCounterOfferStatus(id, status) {
    await db
      .update(counterOffers)
      .set({ status })
      .where(eq(counterOffers.id, id));
  }

  async createInvoice(invoice) {
    const result = await db.insert(invoices).values(invoice).returning();
    return result[0];
  }

  async getInvoice(auctionId) {
    const result = await db
      .select()
      .from(invoices)
      .where(eq(invoices.auctionId, auctionId))
      .limit(1);
    return result[0];
  }
}

// Initialize storage with fallback
let storageInstance;

async function initializeStorage() {
  if (storageInstance) return storageInstance;

  if (isConnected) {
    try {
      storageInstance = new DatabaseStorage();
      // Test the connection
      await storageInstance.getAuctions();
      console.log("✅ Using database storage");
      return storageInstance;
    } catch (error) {
      console.warn(
        "⚠️ Database test failed, falling back to memory storage:",
        (error && error.message) || error
      );
    }
  }

  const { MemoryStorage } = await import("./storage-fallback.js").catch(async () => {
    // if extensionless import is needed in your setup, fall back:
    return await import("./storage-fallback");
  });

  storageInstance = new MemoryStorage();
  console.log("📦 Using memory storage with demo data");
  return storageInstance;
}

export const getStorage = async () => {
  return await initializeStorage();
};

// For backwards compatibility, initialize immediately
export let storage;
initializeStorage()
  .then((s) => (storage = s))
  .catch(console.error);
