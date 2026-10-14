
"use client";

import { useEffect, useRef, useState } from "react";

type Vehicle = {
  year: string;
  make: string;
  model: string;
  mileage: string;
  location: string;
};

type Deal = {
  id: number;
  vin: string;
  vehicle: Vehicle;
  resale: string;
  parts: string;
  labor: string;
  auctionFees: string;
  transport: string;
  detailing: string;
  reserve: string;
  profit: string;
  purchase: string;
  savedAt: string;
};

type VehicleCaseStatus =
  | "Evaluating"
  | "Approved to Buy"
  | "Purchased"
  | "In Repair"
  | "Ready to List"
  | "Listed"
  | "Sold"
  | "Passed";

type VehicleCase = {
  id: number;
  caseNumber: string;
  vin: string;
  vehicle: Vehicle;
  purchase: string;
  resale: string;
  parts: string;
  labor: string;
  auctionFees: string;
  transport: string;
  detailing: string;
  reserve: string;
  status: VehicleCaseStatus;
  issueNotes: string;
  createdAt: string;
};

type InspectionPhoto = {
  id: number;
  name: string;
  area: string;
  notes: string;
  previewUrl: string;
};

const STORAGE_KEY = "dealer-ai-saved-deals";
const CASES_STORAGE_KEY = "dealer-ai-vehicle-cases";

const scanAreas = [
  "Front",
  "Passenger side",
  "Rear",
  "Driver side",
  "Front detail",
  "Interior",
  "Dashboard",
];

const caseStatuses: VehicleCaseStatus[] = [
  "Evaluating",
  "Approved to Buy",
  "Purchased",
  "In Repair",
  "Ready to List",
  "Listed",
  "Sold",
  "Passed",
];

const emptyVehicle: Vehicle = {
  year: "",
  make: "",
  model: "",
  mileage: "",
  location: "",
};

function money(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function Home() {
  const [vin, setVin] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle>(emptyVehicle);
  const [decoding, setDecoding] = useState(false);
  const [vinMessage, setVinMessage] = useState("");

  const [resale, setResale] = useState("15000");
  const [parts, setParts] = useState("800");
  const [labor, setLabor] = useState("600");
  const [auctionFees, setAuctionFees] = useState("500");
  const [transport, setTransport] = useState("200");
  const [detailing, setDetailing] = useState("150");
  const [reserve, setReserve] = useState("500");
  const [profit, setProfit] = useState("2000");

  const [savedDeals, setSavedDeals] = useState<Deal[]>([]);
  const [vehicleCases, setVehicleCases] = useState<VehicleCase[]>([]);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"calculator" | "cases">(
    "calculator"
  );

  const [inspectionPhotos, setInspectionPhotos] = useState<
    InspectionPhoto[]
  >([]);
  const [photoMessage, setPhotoMessage] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [scanStep, setScanStep] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load saved deals and vehicle cases from this browser.
  useEffect(() => {
    try {
      const deals = localStorage.getItem(STORAGE_KEY);
      const cases = localStorage.getItem(CASES_STORAGE_KEY);

      if (deals) {
        setSavedDeals(JSON.parse(deals) as Deal[]);
      }

      if (cases) {
        setVehicleCases(JSON.parse(cases) as VehicleCase[]);
      }
    } catch (error) {
      console.error("Could not load saved data:", error);
    } finally {
      setStorageLoaded(true);
    }
  }, []);

  // Save changes to the browser after the initial load.
  useEffect(() => {
    if (!storageLoaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedDeals));
      localStorage.setItem(
        CASES_STORAGE_KEY,
        JSON.stringify(vehicleCases)
      );
    } catch (error) {
      console.error("Could not save data:", error);
    }
  }, [savedDeals, vehicleCases, storageLoaded]);

  // Stop the camera when leaving the page.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Calculate the deal.
  const resaleValue = numberValue(resale);
  const partsValue = numberValue(parts);
  const laborValue = numberValue(labor);
  const feesValue = numberValue(auctionFees);
  const transportValue = numberValue(transport);
  const detailingValue = numberValue(detailing);
  const reserveValue = numberValue(reserve);
  const profitValue = numberValue(profit);

  const totalExpenses =
    partsValue +
    laborValue +
    feesValue +
    transportValue +
    detailingValue;

  const maxPurchasePrice =
    resaleValue - totalExpenses - reserveValue - profitValue;

  const estimatedProfitAtPurchase = (
    purchasePrice: number
  ) =>
    resaleValue -
    purchasePrice -
    totalExpenses -
    reserveValue;

  // Decode a VIN through the NHTSA public API.
  async function decodeVin() {
    const cleanVin = vin.trim().toUpperCase();

    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(cleanVin)) {
      setVinMessage("Enter a valid 17-character VIN.");
      return;
    }

    setDecoding(true);
    setVinMessage("");

    try {
      const response = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${cleanVin}?format=json`
      );

      if (!response.ok) {
        throw new Error("VIN lookup failed.");
      }

      const data = await response.json();
      const result = data.Results?.[0];

      if (!result) {
        setVinMessage("No vehicle information was returned.");
        return;
      }

      const decodedYear = result.ModelYear || "";
      const decodedMake = result.Make || "";
      const decodedModel = result.Model || "";

      if (!decodedYear && !decodedMake && !decodedModel) {
        setVinMessage(
          "The VIN could not be decoded. Check the VIN and try again."
        );
        return;
      }

      setVehicle((current) => ({
        ...current,
        year: decodedYear,
        make: decodedMake,
        model: decodedModel,
      }));

      setVinMessage(
        `Vehicle found: ${decodedYear} ${decodedMake} ${decodedModel}`
      );
    } catch (error) {
      console.error("VIN decoding error:", error);
      setVinMessage(
        "VIN lookup failed. Check your connection and try again."
      );
    } finally {
      setDecoding(false);
    }
  }

  // Start the phone camera.
  async function startCamera() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPhotoMessage(
          "Camera access requires HTTPS and a supported browser."
        );
        return;
      }

      // Avoid opening multiple camera streams.
      streamRef.current?.getTracks().forEach((track) => track.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraOn(true);
      setPhotoMessage("Camera ready. Start your vehicle walkaround.");
    } catch (error) {
      console.error("Camera error:", error);
      setPhotoMessage(
        "Camera access failed. Allow camera permission and try again."
      );
    }
  }

  // Stop the phone camera.
  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOn(false);
    setPhotoMessage("Camera stopped.");
  }

  // Capture a photo from the camera preview.
  async function captureScanPhoto() {
    const video = videoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      setPhotoMessage("Wait for the camera preview to load.");
      return;
    }

    if (inspectionPhotos.length >= 40) {
      setPhotoMessage("Maximum of 40 inspection photos reached.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      setPhotoMessage("Could not capture the image.");
      return;
    }

    context.drawImage(video, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.85);
    });

    if (!blob) {
      setPhotoMessage("Could not create the photo.");
      return;
    }

    const photo: InspectionPhoto = {
      id: Date.now() + Math.random(),
      name: `${scanAreas[scanStep]} - ${Date.now()}.jpg`,
      area: scanAreas[scanStep],
      notes: "",
      previewUrl: URL.createObjectURL(blob),
    };

    setInspectionPhotos((current) => [...current, photo]);
    setPhotoMessage(`${scanAreas[scanStep]} photo captured.`);

    setScanStep((current) =>
      Math.min(current + 1, scanAreas.length - 1)
    );
  }

  // Remove an inspection photo.
  function removeInspectionPhoto(id: number) {
    setInspectionPhotos((current) => {
      const photo = current.find((item) => item.id === id);

      if (photo) {
        URL.revokeObjectURL(photo.previewUrl);
      }

      return current.filter((item) => item.id !== id);
    });
  }

  // Save the current vehicle and its financial estimates.
  function saveDeal() {
    const deal: Deal = {
      id: Date.now(),
      vin: vin.trim().toUpperCase(),
      vehicle: { ...vehicle },
      resale,
      parts,
      labor,
      auctionFees,
      transport,
      detailing,
      reserve,
      profit,
      purchase: String(Math.max(0, maxPurchasePrice)),
      savedAt: new Date().toLocaleString(),
    };

    setSavedDeals((current) => [deal, ...current]);
    setVinMessage("Deal saved successfully.");
  }

  // Load a saved deal back into the calculator.
  function loadDeal(deal: Deal) {
    setVin(deal.vin);
    setVehicle({ ...deal.vehicle });
    setResale(deal.resale);
    setParts(deal.parts);
    setLabor(deal.labor);
    setAuctionFees(deal.auctionFees);
    setTransport(deal.transport);
    setDetailing(deal.detailing);
    setReserve(deal.reserve);
    setProfit(deal.profit);
    setActiveTab("calculator");
    setVinMessage("Saved deal loaded.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Delete a saved deal.
  function deleteDeal(id: number) {
    setSavedDeals((current) =>
      current.filter((deal) => deal.id !== id)
    );
  }

  // Create a case to track the vehicle through the dealership.
  function createVehicleCase() {
    const newCase: VehicleCase = {
      id: Date.now(),
      caseNumber: `VC-${Date.now().toString().slice(-6)}`,
      vin: vin.trim().toUpperCase(),
      vehicle: { ...vehicle },
      purchase: String(Math.max(0, maxPurchasePrice)),
      resale,
      parts,
      labor,
      auctionFees,
      transport,
      detailing,
      reserve,
      status: "Evaluating",
      issueNotes: "",
      createdAt: new Date().toLocaleDateString(),
    };

    setVehicleCases((current) => [newCase, ...current]);
    setActiveTab("cases");
  }

  // Update the status of a vehicle case.
  function updateCaseStatus(id: number, status: VehicleCaseStatus) {
    setVehicleCases((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status } : item
      )
    );
  }

  // Update inspection notes.
  function updateCaseNotes(id: number, issueNotes: string) {
    setVehicleCases((current) =>
      current.map((item) =>
        item.id === id ? { ...item, issueNotes } : item
      )
    );
  }

  // Delete a vehicle case.
  function deleteVehicleCase(id: number) {
    setVehicleCases((current) =>
      current.filter((item) => item.id !== id)
    );
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const labelClass =
    "mb-1.5 block text-sm font-medium text-slate-600";

  const cardClass =
    "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

  const buttonClass =
    "rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              CarAI
            </h1>
            <p className="text-sm text-slate-500">
              Dealer acquisition and vehicle inspection platform
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab("calculator")}
              className={`rounded-lg px-4 py-2 font-medium ${
                activeTab === "calculator"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              Deal Calculator
            </button>
            <button
              onClick={() => setActiveTab("cases")}
              className={`rounded-lg px-4 py-2 font-medium ${
                activeTab === "cases"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              Vehicle Cases ({vehicleCases.length})
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-5 py-8">
        {activeTab === "calculator" && (
          <>
            <section className={cardClass}>
              <h2 className="mb-1 text-xl font-bold">
                Vehicle Information
              </h2>
              <p className="mb-5 text-sm text-slate-500">
                Decode a VIN or enter vehicle information manually.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1">
                  <label className={labelClass}>Vehicle VIN</label>
                  <input
                    className={inputClass}
                    value={vin}
                    onChange={(event) =>
                      setVin(event.target.value.toUpperCase())
                    }
                    placeholder="Enter 17-character VIN"
                    maxLength={17}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    className={buttonClass}
                    onClick={decodeVin}
                    disabled={decoding}
                  >
                    {decoding ? "Decoding..." : "Decode VIN"}
                  </button>
                </div>
              </div>

              {vinMessage && (
                <p className="mt-3 text-sm text-blue-700" role="status">
                  {vinMessage}
                </p>
              )}

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    ["Year", "year"],
                    ["Make", "make"],
                    ["Model", "model"],
                    ["Mileage", "mileage"],
                    ["Location", "location"],
                  ] as const
                ).map(([label, key]) => (
                  <div key={key}>
                    <label className={labelClass}>{label}</label>
                    <input
                      className={inputClass}
                      value={vehicle[key]}
                      onChange={(event) =>
                        setVehicle((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                      placeholder={label}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
              <div className={`${cardClass} lg:col-span-2`}>
                <h2 className="mb-1 text-xl font-bold">
                  Deal Calculator
                </h2>
                <p className="mb-5 text-sm text-slate-500">
                  Estimate your maximum purchase price before buying.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["Expected resale price ($)", resale, setResale],
                      ["Parts estimate ($)", parts, setParts],
                      ["Labor estimate ($)", labor, setLabor],
                      ["Auction fees ($)", auctionFees, setAuctionFees],
                      ["Transportation ($)", transport, setTransport],
                      ["Detailing ($)", detailing, setDetailing],
                      ["Unexpected-cost reserve ($)", reserve, setReserve],
                      ["Target profit ($)", profit, setProfit],
                    ] as const
                  ).map(([label, value, setter]) => (
                    <div key={label}>
                      <label className={labelClass}>{label}</label>
                      <input
                        className={inputClass}
                        type="number"
                        min="0"
                        step="50"
                        value={value}
                        onChange={(event) => setter(event.target.value)}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button className={buttonClass} onClick={saveDeal}>
                    Save Deal
                  </button>
                  <button
                    className="rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={createVehicleCase}
                  >
                    Create Vehicle Case
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
                  <p className="text-sm text-slate-300">
                    Maximum Purchase Price
                  </p>
                  <p className="mt-2 text-4xl font-black">
                    {money(Math.max(0, maxPurchasePrice))}
                  </p>
                  <p className="mt-3 text-sm text-slate-300">
                    Based on your resale estimate, costs, reserve, and
                    target profit.
                  </p>
                </div>

                <div className={cardClass}>
                  <h3 className="font-bold">Deal Breakdown</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Resale price</span>
                      <span className="font-semibold">
                        {money(resaleValue)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Repair and fees</span>
                      <span className="font-semibold">
                        {money(totalExpenses)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Reserve</span>
                      <span className="font-semibold">
                        {money(reserveValue)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Target profit</span>
                      <span className="font-semibold">
                        {money(profitValue)}
                      </span>
                    </div>
                    <hr className="border-slate-200" />
                    <div className="flex justify-between gap-3">
                      <span className="font-bold">Total deductions</span>
                      <span className="font-bold">
                        {money(
                          totalExpenses + reserveValue + profitValue
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className={cardClass}>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">
                    360° Vehicle Walkaround
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Capture exterior and interior photos for inspection.
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                  {inspectionPhotos.length}/40 photos
                </span>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <div className="overflow-hidden rounded-xl bg-slate-950">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="aspect-video w-full object-cover"
                    />
                  </div>

                  <p className="mt-3 text-sm text-slate-600">
                    Current capture area:{" "}
                    <strong>{scanAreas[scanStep]}</strong>
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className={buttonClass}
                      onClick={startCamera}
                      disabled={cameraOn}
                    >
                      Start Camera
                    </button>
                    <button
                      className="rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      onClick={captureScanPhoto}
                      disabled={!cameraOn || inspectionPhotos.length >= 40}
                    >
                      Capture Photo
                    </button>
                    <button
                      className="rounded-lg border border-slate-300 px-4 py-2.5 font-semibold hover:bg-slate-50"
                      onClick={stopCamera}
                      disabled={!cameraOn}
                    >
                      Stop Camera
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {scanAreas.map((area, index) => (
                      <button
                        key={area}
                        onClick={() => setScanStep(index)}
                        className={`rounded-full px-3 py-1.5 text-sm ${
                          scanStep === index
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {area}
                      </button>
                    ))}
                  </div>

                  {photoMessage && (
                    <p className="mt-3 text-sm text-blue-700" role="status">
                      {photoMessage}
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="mb-3 font-bold">
                    Inspection Photos ({inspectionPhotos.length})
                  </h3>

                  {inspectionPhotos.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                      Start the camera and capture your first photo.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {inspectionPhotos.map((photo) => (
                        <div
                          key={photo.id}
                          className="overflow-hidden rounded-xl border border-slate-200"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.previewUrl}
                            alt={photo.area}
                            className="aspect-square w-full object-cover"
                          />
                          <div className="p-2">
                            <p className="truncate text-xs font-semibold">
                              {photo.area}
                            </p>
                            <button
                              className="mt-2 text-xs font-semibold text-red-600 hover:text-red-800"
                              onClick={() =>
                                removeInspectionPhoto(photo.id)
                              }
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="mt-4 text-xs leading-5 text-slate-500">
                    Photos currently stay in this browser session. They
                    are not uploaded to a server, converted into a 3D model,
                    or analyzed for damage yet.
                  </p>
                </div>
              </div>
            </section>

            <section className={cardClass}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">Saved Deals</h2>
                  <p className="text-sm text-slate-500">
                    Your saved calculations on this browser.
                  </p>
                </div>
                <span className="text-sm text-slate-500">
                  {savedDeals.length} saved
                </span>
              </div>

              {savedDeals.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-5 text-sm text-slate-500">
                  No saved deals yet. Enter a vehicle and click Save Deal.
                </p>
              ) : (
                <div className="space-y-3">
                  {savedDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"
                    >
                      <div>
                        <p className="font-bold">
                          {deal.vehicle.year} {deal.vehicle.make}{" "}
                          {deal.vehicle.model}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          VIN: {deal.vin || "Not provided"} · Saved{" "}
                          {deal.savedAt}
                        </p>
                        <p className="mt-2 text-sm">
                          Max purchase:{" "}
                          <strong>
                            {money(numberValue(deal.purchase))}
                          </strong>
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                          onClick={() => loadDeal(deal)}
                        >
                          Load
                        </button>
                        <button
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                          onClick={() => deleteDeal(deal.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === "cases" && (
          <section className={cardClass}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">Vehicle Cases</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Track each vehicle from evaluation through sale.
                </p>
              </div>
              <button
                className={buttonClass}
                onClick={() => setActiveTab("calculator")}
              >
                + New Vehicle
              </button>
            </div>

            {vehicleCases.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-300 p-10 text-center">
                <h3 className="font-bold">No vehicle cases yet</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Open the Deal Calculator and click Create Vehicle Case.
                </p>
                <button
                  className={`${buttonClass} mt-4`}
                  onClick={() => setActiveTab("calculator")}
                >
                  Open Calculator
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {vehicleCases.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                          {item.caseNumber}
                        </p>
                        <h3 className="mt-1 text-lg font-bold">
                          {item.vehicle.year} {item.vehicle.make}{" "}
                          {item.vehicle.model}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          VIN: {item.vin || "Not provided"} · Created{" "}
                          {item.createdAt}
                        </p>
                      </div>

                      <div>
                        <label
                          className={labelClass}
                          htmlFor={`status-${item.id}`}
                        >
                          Case status
                        </label>
                        <select
                          id={`status-${item.id}`}
                          className={inputClass}
                          value={item.status}
                          onChange={(event) =>
                            updateCaseStatus(
                              item.id,
                              event.target.value as VehicleCaseStatus
                            )
                          }
                        >
                          {caseStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">
                          Maximum purchase
                        </p>
                        <p className="mt-1 font-bold">
                          {money(numberValue(item.purchase))}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">
                          Expected resale
                        </p>
                        <p className="mt-1 font-bold">
                          {money(numberValue(item.resale))}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">
                          Estimated costs
                        </p>
                        <p className="mt-1 font-bold">
                          {money(
                            numberValue(item.parts) +
                              numberValue(item.labor) +
                              numberValue(item.auctionFees) +
                              numberValue(item.transport) +
                              numberValue(item.detailing) +
                              numberValue(item.reserve)
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label
                        className={labelClass}
                        htmlFor={`notes-${item.id}`}
                      >
                        Inspection and repair notes
                      </label>
                      <textarea
                        id={`notes-${item.id}`}
                        className={inputClass}
                        rows={3}
                        placeholder="Record visible damage, needed repairs, title concerns, or follow-up..."
                        value={item.issueNotes}
                        onChange={(event) =>
                          updateCaseNotes(item.id, event.target.value)
                        }
                      />
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                        onClick={() => deleteVehicleCase(item.id)}
                      >
                        Delete Case
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <footer className="pb-6 text-center text-xs leading-5 text-slate-500">
          CarAI is a decision-support tool. Verify vehicle condition,
          title history, repair costs, and market value independently
          before purchasing.
        </footer>
      </div>
    </main>
  );
}
