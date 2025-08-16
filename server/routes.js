import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";

import { getStorage } from "./storage.js";
import { authenticateToken, generateToken } from "./middleware/auth.js";
import { redisService } from "./services/redis.js";
import { EmailService } from "./services/email.js";
import { InvoiceService } from "./services/invoice.js";
import { AuctionService } from "./services/auction.js";
import {
  insertUserSchema,
  insertAuctionSchema,
  insertBidSchema,
} from "../shared/schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @param {import('express').Express} app
 */
export async function registerRoutes(app) {
  const httpServer = createServer(app);

  // ---------- uploads static dir ----------
  const uploadsRoot = path.join(process.cwd(), "server", "uploads");
  if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot, { recursive: true });
  app.use("/uploads", express.static(uploadsRoot));

  // ---------- Multer (images only, 10MB) ----------
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsRoot),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "");
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  });
  const fileFilter = (_req, file, cb) => {
    const ok = /^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype);
    cb(ok ? null : new Error("Only image files are allowed"), ok);
  };
  const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

  // Upload endpoint
  app.post("/api/uploads", upload.array("images", 6), (req, res) => {
    try {
      const files = (req.files || []).map((f) => ({
        filename: f.filename,
        url: `/uploads/${f.filename}`,
        mimetype: f.mimetype,
        size: f.size,
      }));
      if (!files.length) return res.status(400).json({ message: "No files uploaded" });
      res.json({ files });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Upload failed" });
    }
  });

  // Invoices static
  app.use("/api/invoices", express.static(path.join(process.cwd(), "server", "invoices")));

  // Health
  app.get("/api/health", (_req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));

  // ---------- Auth ----------
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { name, email, password, role = "buyer" } = req.body;
      const storage = await getStorage();
      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(400).json({ message: "User already exists" });

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ email, passwordHash, name, role });
      const token = generateToken(user);
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (e) {
      console.error("Signup error:", e);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const storage = await getStorage();
      const user = await storage.getUserByEmail(email);
      const valid = user && (await bcrypt.compare(password, user.passwordHash));
      if (!valid) return res.status(401).json({ message: "Invalid credentials" });

      const token = generateToken(user);
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (e) {
      console.error("Login error:", e);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ✅ Small validate route to stop the “Unexpected token <” in auth.js
  app.get("/api/auth/validate", authenticateToken, async (req, res) => {
    try {
      const storage = await getStorage();
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(401).json({ message: "Invalid token" });
      res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (e) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  
  // ---------- Auctions ----------
  app.get("/api/auctions", async (_req, res) => {
    try {
      const storage = await getStorage();
      const auctions = await storage.getAuctions();
      res.json(auctions);
    } catch (e) {
      console.error("Get auctions error:", e);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auctions/:id", async (req, res) => {
    try {
      const storage = await getStorage();
      const auction = await storage.getAuction(req.params.id);
      if (!auction) return res.status(404).json({ message: "Auction not found" });

      const highestBid = await storage.getHighestBid(auction.id);
      const bids = await storage.getBidsForAuction(auction.id, 10);
      res.json({ auction, highestBid, bids });
    } catch (e) {
      console.error("Get auction error:", e);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ✅ FIX: normalize incoming types BEFORE zod parse
  app.post("/api/auctions", authenticateToken, async (req, res) => {
    try {
      const b = req.body || {};
      const normalized = {
        sellerId: req.user.id,
        itemName: typeof b.itemName === "string" ? b.itemName : String(b.itemName ?? ""),
        description: typeof b.description === "string" ? b.description : String(b.description ?? ""),
        // decimals as strings
        startingPrice: b?.startingPrice != null ? String(b.startingPrice) : undefined,
        bidIncrement: b?.bidIncrement != null ? String(b.bidIncrement) : undefined,
        // timestamp as Date
        goLiveAt: b?.goLiveAt ? new Date(b.goLiveAt) : undefined,
        // integer as number
        durationMinutes:
          typeof b.durationMinutes === "number"
            ? b.durationMinutes
            : b?.durationMinutes != null
              ? parseInt(b.durationMinutes, 10)
              : undefined,
        // optional pass-throughs if your DB layer supports them
        imageUrl: b?.imageUrl ?? undefined,
        images: b?.images ?? undefined,
      };

      const parsed = insertAuctionSchema.safeParse(normalized);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", issues: parsed.error.issues });
      }

      const storage = await getStorage();
      const auction = await storage.createAuction(parsed.data);

      // Non-fatal redis scheduling state
      try {
        if (redisService?.setAuctionState) {
          await redisService.setAuctionState(auction.id, { status: "scheduled" });
        } else if (redisService?.setAuctionStatus) {
          await redisService.setAuctionStatus(auction.id, "scheduled");
        }
      } catch (e) {
        console.warn("Redis set scheduled failed (non-fatal):", e?.message || e);
      }

      AuctionService.scheduleAuctionStart(auction);
      res.status(201).json(auction);
    } catch (e) {
      console.error("Create auction error:", e);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auctions/:id/bids", async (req, res) => {
    try {
      const storage = await getStorage();
      const bids = await storage.getBidsForAuction(req.params.id, 50);
      res.json(bids);
    } catch (error) {
      console.error("Get bids error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Seller decision routes
  app.post("/api/seller/:id/accept", authenticateToken, async (req, res) => {
    try {
      const storage = await getStorage();
      const auctionId = req.params.id;
      const auction = await storage.getAuction(auctionId);

      if (!auction || auction.sellerId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const highestBid = await storage.getHighestBid(auctionId);
      if (!highestBid) {
        return res.status(400).json({ message: "No bids found" });
      }

      const buyer = await storage.getUser(highestBid.bidderId);
      const seller = await storage.getUser(auction.sellerId);
      if (!buyer || !seller) {
        return res.status(400).json({ message: "User not found" });
      }

      await storage.updateAuctionStatus(auctionId, "accepted");

      try {
        await redisService.setAuctionState(auctionId, { status: "accepted" });
      } catch (e) {
        console.warn("Redis setAuctionState(accepted) failed (non-fatal):", e?.message || e);
      }

      const pdfUrl = await InvoiceService.generateInvoice(
        auction,
        buyer,
        seller,
        highestBid.amount
      );
      await storage.createInvoice({
        auctionId,
        buyerId: buyer.id,
        sellerId: seller.id,
        totalAmount: highestBid.amount,
        pdfUrl,
      });

      await EmailService.sendTransactionConfirmation(
        buyer.email,
        seller.email,
        auction.itemName,
        highestBid.amount
      );

      await storage.createNotification({
        userId: buyer.id,
        type: "bid_accepted",
        message: `Your bid has been accepted! You won "${auction.itemName}" for $${highestBid.amount}.`,
        meta: { auctionId, amount: highestBid.amount },
      });

      if (global.io) {
        global.io.to(`auction:${auctionId}`).emit("seller_decision", {
          auctionId,
          decision: "accepted",
        });
      }

      res.json({ message: "Bid accepted successfully" });
    } catch (error) {
      console.error("Accept bid error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/seller/:id/reject", authenticateToken, async (req, res) => {
    try {
      const storage = await getStorage();
      const auctionId = req.params.id;
      const auction = await storage.getAuction(auctionId);

      if (!auction || auction.sellerId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      try {
        await redisService.setAuctionState(auctionId, { status: "rejected" });
      } catch (e) {
        console.warn("Redis setAuctionState(rejected) failed (non-fatal):", e?.message || e);
      }

      const highestBid = await storage.getHighestBid(auctionId);
      if (highestBid) {
        await storage.createNotification({
          userId: highestBid.bidderId,
          type: "bid_rejected",
          message: `Your bid on "${auction.itemName}" has been rejected by the seller.`,
          meta: { auctionId },
        });
      }

      if (global.io) {
        global.io.to(`auction:${auctionId}`).emit("seller_decision", {
          auctionId,
          decision: "rejected",
        });
      }

      res.json({ message: "Bid rejected successfully" });
    } catch (error) {
      console.error("Reject bid error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/seller/:id/counter", authenticateToken, async (req, res) => {
    try {
      const storage = await getStorage();
      const auctionId = req.params.id;
      const { amount } = req.body;

      const auction = await storage.getAuction(auctionId);
      if (!auction || auction.sellerId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const highestBid = await storage.getHighestBid(auctionId);
      if (!highestBid) {
        return res.status(400).json({ message: "No bids found" });
      }

      const counterOffer = await storage.createCounterOffer({
        auctionId,
        sellerId: auction.sellerId,
        bidderId: highestBid.bidderId,
        amount,
      });

      await storage.updateAuctionStatus(auctionId, "counter_pending");

      const buyer = await storage.getUser(highestBid.bidderId);
      if (buyer) {
        await EmailService.sendCounterOfferNotification(
          buyer.email,
          auction.itemName,
          amount
        );
        await storage.createNotification({
          userId: buyer.id,
          type: "counter_offer",
          message: `The seller has made a counter offer of $${amount} for "${auction.itemName}".`,
          meta: { auctionId, counterOfferId: counterOffer.id, amount },
        });

        if (global.io) {
          global.io.to(`user:${buyer.id}`).emit("counter_offer", {
            auctionId,
            amount,
          });
        }
      }

      res.json({ message: "Counter offer sent successfully" });
    } catch (error) {
      console.error("Counter offer error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Counter offer response routes
  app.post("/api/counter/:id/accept", authenticateToken, async (req, res) => {
    try {
      const storage = await getStorage();
      const counterOfferId = req.params.id;
      const counterOffer = await storage.getCounterOffer(counterOfferId);

      if (!counterOffer || counterOffer.bidderId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      await storage.updateCounterOfferStatus(counterOfferId, "accepted");
      await storage.updateAuctionStatus(
        counterOffer.auctionId,
        "counter_accepted"
      );

      const auction = await storage.getAuction(counterOffer.auctionId);
      const buyer = await storage.getUser(counterOffer.bidderId);
      const seller = await storage.getUser(counterOffer.sellerId);

      if (auction && buyer && seller) {
        const pdfUrl = await InvoiceService.generateInvoice(
          auction,
          buyer,
          seller,
          counterOffer.amount
        );
        await storage.createInvoice({
          auctionId: auction.id,
          buyerId: buyer.id,
          sellerId: seller.id,
          totalAmount: counterOffer.amount,
          pdfUrl,
        });

        await EmailService.sendTransactionConfirmation(
          buyer.email,
          seller.email,
          auction.itemName,
          counterOffer.amount
        );

        if (global.io) {
          global.io.to(`auction:${auction.id}`).emit("counter_result", {
            auctionId: auction.id,
            result: "accepted",
          });
        }
      }

      res.json({ message: "Counter offer accepted successfully" });
    } catch (error) {
      console.error("Accept counter offer error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/counter/:id/reject", authenticateToken, async (req, res) => {
    try {
      const storage = await getStorage();
      const counterOfferId = req.params.id;
      const counterOffer = await storage.getCounterOffer(counterOfferId);

      if (!counterOffer || counterOffer.bidderId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      await storage.updateCounterOfferStatus(counterOfferId, "rejected");
      await storage.updateAuctionStatus(
        counterOffer.auctionId,
        "counter_rejected"
      );

      if (global.io) {
        global.io
          .to(`auction:${counterOffer.auctionId}`)
          .emit("counter_result", {
            auctionId: counterOffer.auctionId,
            result: "rejected",
          });
      }

      res.json({ message: "Counter offer rejected successfully" });
    } catch (error) {
      console.error("Reject counter offer error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Notifications
  app.get("/api/notifications", authenticateToken, async (req, res) => {
    try {
      const storage = await getStorage();
      const notifications = await storage.getNotificationsForUser(req.user.id);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/notifications/:id/read", authenticateToken, async (req, res) => {
    try {
      const storage = await getStorage();
      await storage.markNotificationRead(req.params.id);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ---------- WebSocket ----------
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  global.io = {
    to: (room) => ({
      emit: (event, data) => {
        wss.clients.forEach((client) => {
          if (
            client.readyState === WebSocket.OPEN &&
            (client.auctionId === room.replace("auction:", "") || `user:${client.userId}` === room)
          ) {
            client.send(JSON.stringify({ event, data }));
          }
        });
      },
    }),
  };

  wss.on("connection", (ws) => {
    ws.on("message", async (message) => {
      try {
        const { event, data } = JSON.parse(message);
        const storage = await getStorage();

        switch (event) {
          case "identify":
            ws.userId = data?.userId;
            break;

          case "join_auction": {
            const { auctionId } = data;
            ws.auctionId = auctionId;

            const auction = await storage.getAuction(auctionId);
            if (auction) {
              const currentBid = await redisService.getHighestBid(auctionId);
              const status = (await redisService.getAuctionStatus(auctionId)) || auction.status;

              const endTime = new Date(auction.goLiveAt).getTime() + auction.durationMinutes * 60 * 1000;

              ws.send(JSON.stringify({
                  event: "auction_state",
                  data: {
                    status,
                    currentHighestBid: currentBid,
                    endsAt: new Date(endTime),
                    goLiveAt: auction.goLiveAt,
                  },
                })
              );
            }
            break;
          }

          case "place_bid": {
            if (!data.userId) {
              ws.send(
                JSON.stringify({
                  event: "error",
                  data: {
                    code: "AUTH_REQUIRED",
                    message: "Authentication required",
                  },
                })
              );
              break;
            }

            // remember the user on this socket for targeted notifications
            ws.userId = data.userId;

            const bidAuctionId = data.auctionId;
            const bidAmount = parseFloat(data.amount);
            const bidderId = data.userId;

            const lockAcquired = await redisService.acquireLock(bidAuctionId);
            if (!lockAcquired) {
              ws.send(
                JSON.stringify({
                  event: "error",
                  data: {
                    code: "BID_LOCK_FAILED",
                    message:
                      "Another bid is being processed. Please try again.",
                  },
                })
              );
              break;
            }

            try {
              const bidAuction = await storage.getAuction(bidAuctionId);
              if (!bidAuction) {
                ws.send(
                  JSON.stringify({
                    event: "error",
                    data: {
                      code: "AUCTION_NOT_FOUND",
                      message: "Auction not found",
                    },
                  })
                );
                break;
              }

              const now = Date.now();
              const startTime = new Date(bidAuction.goLiveAt).getTime();
              const endTime =
                startTime + bidAuction.durationMinutes * 60 * 1000;

              if (now < startTime) {
                ws.send(
                  JSON.stringify({
                    event: "error",
                    data: {
                      code: "AUCTION_NOT_STARTED",
                      message: "Auction has not started yet",
                    },
                  })
                );
                break;
              }

              if (now > endTime) {
                ws.send(
                  JSON.stringify({
                    event: "error",
                    data: {
                      code: "AUCTION_ENDED",
                      message: "Auction has ended",
                    },
                  })
                );
                break;
              }

              const currentHighest =
                await redisService.getHighestBid(bidAuctionId);
              const minBid = currentHighest
                ? parseFloat(currentHighest.amount) +
                parseFloat(bidAuction.bidIncrement)
                : parseFloat(bidAuction.startingPrice);

              if (bidAmount < minBid) {
                ws.send(
                  JSON.stringify({
                    event: "error",
                    data: {
                      code: "BID_TOO_LOW",
                      message: `Minimum bid is $${minBid}`,
                    },
                  })
                );
                break;
              }

              const bid = await storage.createBid({
                auctionId: bidAuctionId,
                bidderId,
                amount: bidAmount.toString(),
              });

              await redisService.setHighestBid(bidAuctionId, {
                amount: bidAmount.toString(),
                bidderId,
                bidId: bid.id,
              });

              await storage.updateAuctionStatus(
                bidAuctionId,
                bidAuction.status,
                bid.id
              );

              if (currentHighest && currentHighest.bidderId !== bidderId) {
                await storage.createNotification({
                  userId: currentHighest.bidderId,
                  type: "outbid",
                  message: `You have been outbid on "${bidAuction.itemName}". Current highest bid: $${bidAmount}`,
                  meta: {
                    auctionId: bidAuctionId,
                    previousBid: currentHighest.amount,
                    newBid: bidAmount,
                  },
                });

                // targeted notify if the previous highest bidder is connected
                wss.clients.forEach((client) => {
                  if (
                    client.readyState === WebSocket.OPEN &&
                    client.userId === currentHighest.bidderId
                  ) {
                    client.send(
                      JSON.stringify({
                        event: "outbid",
                        data: {
                          yourBidId: currentHighest.bidId,
                          newHighestBid: {
                            id: bid.id,
                            amount: bidAmount,
                            bidderId,
                          },
                        },
                      })
                    );
                  }
                });
              }

              await storage.createNotification({
                userId: bidAuction.sellerId,
                type: "new_bid",
                message: `New bid of $${bidAmount} placed on "${bidAuction.itemName}"`,
                meta: { auctionId: bidAuctionId, bidAmount, bidderId },
              });

              wss.clients.forEach((client) => {
                if (
                  client.readyState === WebSocket.OPEN &&
                  client.auctionId === bidAuctionId
                ) {
                  client.send(
                    JSON.stringify({
                      event: "bid_placed",
                      data: {
                        bid: { id: bid.id, amount: bidAmount, bidderId },
                        currentHighestBid: {
                          id: bid.id,
                          amount: bidAmount,
                          bidderId,
                        },
                      },
                    })
                  );
                }
              });
            } finally {
              await redisService.releaseLock(bidAuctionId);
            }
            break;
          }

          default:
            // ignore unknown events
            break;
        }
      } catch (error) {
        console.error("WebSocket error:", error);
        ws.send(
          JSON.stringify({
            event: "error",
            data: { code: "INTERNAL_ERROR", message: "Internal server error" },
          })
        );
      }
    });

    ws.on("close", async () => {
      try {
        if (ws.userId && ws.auctionId) {
          await redisService.removeUserFromAuction(ws.auctionId, ws.userId);
        }
      } catch {}
    });
  });

  // Initialize auction timers on server start
  AuctionService.initializeAuctionTimers();

  // Admin routes
  app.get("/api/admin/auctions", authenticateToken, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const storage = await getStorage();
      const auctions = await storage.getAuctions();

      // Add seller information to each auction
      const auctionsWithSellers = await Promise.all(
        auctions.map(async (auction) => {
          const seller = await storage.getUser(auction.sellerId);
          return {
            ...auction,
            seller: seller
              ? {
                id: seller.id,
                name: seller.name,
                email: seller.email,
              }
              : null,
          };
        })
      );

      res.json(auctionsWithSellers);
    } catch (error) {
      console.error("Get admin auctions error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/users", authenticateToken, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const storage = await getStorage();
      const users = (await storage.getUsers?.()) || [];
      res.json(users);
    } catch (error) {
      console.error("Get admin users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  

  app.post("/api/admin/auctions/:id/start", authenticateToken, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const storage = await getStorage();
      const auctionId = req.params.id;
      const auction = await storage.getAuction(auctionId);

      if (!auction) {
        return res.status(404).json({ message: "Auction not found" });
      }

      // Update auction status to live
      await storage.updateAuctionStatus(auctionId, "live");
      try {
        await redisService.setAuctionState(auctionId, { status: "live" });
      } catch (e) {
        console.warn("Redis setAuctionState(live) failed (non-fatal):", e?.message || e);
      }

      // Notify clients
      if (global.io) {
        global.io.to(`auction:${auctionId}`).emit("auction_started", {
          auctionId,
          status: "live",
        });
      }

      res.json({ message: "Auction started successfully" });
    } catch (error) {
      console.error("Start auction error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/auctions/:id/reset", authenticateToken, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const storage = await getStorage();
      const auctionId = req.params.id;
      const auction = await storage.getAuction(auctionId);

      if (!auction) {
        return res.status(404).json({ message: "Auction not found" });
      }

      // Reset auction status to scheduled
      await storage.updateAuctionStatus(auctionId, "scheduled");
      try {
        await redisService.setAuctionState(auctionId, { status: "scheduled" });
      } catch (e) {
        console.warn("Redis setAuctionState(scheduled) failed (non-fatal):", e?.message || e);
      }
      await redisService.del(`auction:${auctionId}:highestBid`);

      // Notify clients
      if (global.io) {
        global.io.to(`auction:${auctionId}`).emit("auction_reset", {
          auctionId,
          status: "scheduled",
        });
      }

      res.json({ message: "Auction reset successfully" });
    } catch (error) {
      console.error("Reset auction error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
