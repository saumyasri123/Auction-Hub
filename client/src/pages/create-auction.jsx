import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { authManager } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { uploadImages } from "@/lib/uploads";
import { useLocation } from "wouter";
import { Gavel, Upload, DollarSign } from "lucide-react";

const createAuctionSchema = z.object({
  itemName: z.string().min(3, "Item name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  startingPrice: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Starting price must be a positive number"),
  bidIncrement: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Bid increment must be a positive number"),
  goLiveAt: z.string().refine((val) => new Date(val) > new Date(), "Go live date must be in the future"),
  durationMinutes: z.string().min(1, "Duration is required"),
});

export default function CreateAuction() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = authManager.getCurrentUser();

  // ---------- image upload state ----------
  const [imageUrls, setImageUrls] = useState([]);       // server URLs (/uploads/xxx)
  const [previewUrls, setPreviewUrls] = useState([]);   // local object URLs
  const [uploading, setUploading] = useState(false);

  async function handleFilesPicked(e) {
    const files = e.target.files;
    if (!files || !files.length) return;

    // local previews
    const localPreviews = [...files].map((f) => URL.createObjectURL(f));
    setPreviewUrls(localPreviews);

    // upload to server
    try {
      setUploading(true);
      const urls = await uploadImages(files); // returns ['/uploads/..', ...]
      setImageUrls(urls);
      toast({ title: "Images uploaded", description: `${urls.length} file(s) ready` });
    } catch (err) {
      console.error(err);
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      setPreviewUrls([]);
      setImageUrls([]);
    } finally {
      setUploading(false);
    }
  }
  // ---------------------------------------

  const form = useForm({
    resolver: zodResolver(createAuctionSchema),
    defaultValues: {
      itemName: "",
      description: "",
      startingPrice: "",
      bidIncrement: "",
      goLiveAt: "",
      durationMinutes: "",
    },
  });

  // const onSubmit = (data) => {
  //   console.log("[CreateAuction] payload preview:", {
  //     ...data,
  //     // keep price fields as strings; keep goLiveAt raw; server will coerce
  //     durationMinutes: parseInt(data.durationMinutes, 10),
  //     imageUrl: imageUrls[0] || null,
  //     images: imageUrls,
  //   });
  //   createAuctionMutation.mutate(data);
  // };

  const createAuctionMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        itemName: data.itemName.trim(),
        description: data.description.trim(),
        startingPrice: data.startingPrice.trim(),  // <- string
        bidIncrement:  data.bidIncrement.trim(),   // <- string
        durationMinutes: Number.parseInt(data.durationMinutes, 10),
        goLiveAt: new Date(data.goLiveAt).toISOString(), // server converts to Date
        status: "scheduled",                    
        ...(imageUrls.length ? { imageUrl: imageUrls[0], images: imageUrls } : {}),
      };


      console.log("[CreateAuction] sending payload:", payload);

      const response = await apiRequest("POST", "/api/auctions", payload);
      return response;
    },
    onSuccess: (auction) => {
      toast({
        title: "Auction Created!",
        description: `Your auction "${auction.itemName}" has been created successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
      navigate("/seller-dashboard");
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description:
          (error && error.message) ||
          "Failed to create auction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data) => createAuctionMutation.mutate(data);


  useEffect(() => {
    if (!user || user.role !== "seller") {
      navigate("/");
    }
  }, [user, navigate]);

  if (!user || user.role !== "seller") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h1 className="text-xl font-semibold mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-4">
              You must be a seller to create auctions.
            </p>
            <Button onClick={() => navigate("/")} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create New Auction
          </h1>
          <p className="text-gray-600">
            Fill in the details below to create your auction listing.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Gavel className="w-5 h-5" />
              <span>Auction Details</span>
            </CardTitle>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="itemName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter item name"
                              {...field}
                              className="focus:ring-2 focus:ring-primary"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe your item in detail..."
                              rows={4}
                              {...field}
                              className="focus:ring-2 focus:ring-primary"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startingPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Starting Price</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="1"
                                  placeholder="0.00"
                                  {...field}
                                  className="pl-8 focus:ring-2 focus:ring-primary"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="bidIncrement"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bid Increment</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="1"
                                  placeholder="10.00"
                                  {...field}
                                  className="pl-8 focus:ring-2 focus:ring-primary"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="goLiveAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Go Live Date & Time</FormLabel>
                          <FormControl>
                            <Input
                              type="datetime-local"
                              {...field}
                              className="focus:ring-2 focus:ring-primary"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="durationMinutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="focus:ring-2 focus:ring-primary">
                                <SelectValue placeholder="Select duration" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="30">30 minutes</SelectItem>
                              <SelectItem value="60">1 hour</SelectItem>
                              <SelectItem value="120">2 hours</SelectItem>
                              <SelectItem value="240">4 hours</SelectItem>
                              <SelectItem value="480">8 hours</SelectItem>
                              <SelectItem value="1440">24 hours</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Image Upload */}
                    <div className="space-y-2">
                      <Label>Item Images</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-600 mb-2">Upload item images</p>
                        <p className="text-xs text-gray-500 mb-2">
                          PNG, JPG up to 10MB each
                        </p>

                        <Input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                          multiple
                          onChange={handleFilesPicked}
                          disabled={uploading}
                          className="mx-auto max-w-xs cursor-pointer"
                        />

                        {uploading && (
                          <div className="mt-2 text-sm">Uploading…</div>
                        )}

                        {previewUrls.length > 0 && (
                          <div className="mt-4 grid grid-cols-3 gap-3">
                            {previewUrls.map((src, i) => (
                              <img
                                key={i}
                                src={src}
                                alt={`preview-${i}`}
                                className="w-full h-24 object-cover rounded-md border"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/seller-dashboard")}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createAuctionMutation.isPending}
                    className="min-w-[120px]"
                  >
                    {createAuctionMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      "Create Auction"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
