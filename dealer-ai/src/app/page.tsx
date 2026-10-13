
"use client";

import { useEffect, useState } from "react";

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

const STORAGE_KEY = "dealer-ai-saved-deals";

export default function Home() {
  // Vehicle information
  const [vehicle, setVehicle] = useState<Vehicle>({
    year: "2020",
    make: "Toyota",
    model: "Camry",
    mileage: "75000",
    location: "Houston, TX",
  });

  const [vin, setVin] = useState("");
  const [decoding, setDecoding] = useState(false);
  const [vinMessage, setVinMessage] = useState("");

  // Deal calculator inputs
  const [resale, setResale] = useState("16000");
  const [parts, setParts] = useState("400");
  const [labor, setLabor] = useState("500");
  const [auctionFees, setAuctionFees] = useState("400");
  const [transport, setTransport] = useState("200");
  const [detailing, setDetailing] = useState("100");
  const [reserve, setReserve] = useState("300");
  const [profit, setProfit] = useState("2500");
  const [purchase, setPurchase] = useState("11000");

  // Saved deals
  const [deals, setDeals] = useState<Deal[]>([]);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [message, setMessage] = useState("");

  // Load saved deals when the app opens
  useEffect(() => {
    try {
      const storedDeals = localStorage.getItem(STORAGE_KEY);

      if (storedDeals) {
        const parsed = JSON.parse(storedDeals);

        if (Array.isArray(parsed)) {
          setDeals(parsed);
        }
      }
    } catch {
      setMessage("Could not read saved deals from browser storage.");
    } finally {
      setStorageLoaded(true);
    }
  }, []);

  // Keep the saved deals in browser storage
  useEffect(() => {
    if (!storageLoaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
    } catch {
      setMessage("Could not save deals. Check your browser storage.");
    }
  }, [deals, storageLoaded]);

  // Format numbers as dollars
  const money = (value: number) =>
    value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });

  // Add up the estimated costs other than the car purchase
  const totalCosts =
    Number(parts || 0) +
    Number(labor || 0) +
    Number(auctionFees || 0) +
    Number(transport || 0) +
    Number(detailing || 0) +
    Number(reserve || 0);

  // Maximum purchase price while meeting the profit target
  const maxBuy =
    Number(resale || 0) -
    totalCosts -
    Number(profit || 0);

  // Projected profit at the entered purchase price
  const actualProfit =
    Number(resale || 0) -
    Number(purchase || 0) -
    totalCosts;

  const field =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-blue-600";

  // Decode the VIN using the free NHTSA API
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
        throw new Error("The VIN service could not be reached.");
      }

      const data = await response.json();
      const result = data.Results?.[0];

      if (!result) {
        throw new Error("No vehicle information was returned.");
      }

      const year = result.ModelYear || "";
      const make = result.Make || "";
      const model = [result.Model, result.Trim]
        .filter(Boolean)
        .join(" ");

      if (!year && !make && !model) {
        setVinMessage(
          "No vehicle details were found. Check the VIN and try again."
        );
        return;
      }

      setVehicle((current) => ({
        ...current,
        year: year || current.year,
        make: make || current.make,
        model: model || current.model,
      }));

      if (result.ErrorCode && result.ErrorCode !== "0") {
        setVinMessage(
          "Some VIN information may be incomplete. Review the vehicle details."
        );
      } else {
        setVinMessage(
          "VIN decoded. Review the details before saving the deal."
        );
      }
    } catch (error) {
      setVinMessage(
        error instanceof Error
          ? error.message
          : "An error occurred while decoding the VIN."
      );
    } finally {
      setDecoding(false);
    }
  }

  // Save the current vehicle and its financial estimates
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
      purchase,
      savedAt: new Date().toLocaleString(),
    };

    setDeals((current) => [deal, ...current]);
    setMessage("Deal saved successfully.");
  }

  // Load a saved deal back into the calculator
  function loadDeal(deal: Deal) {
    setVehicle({ ...deal.vehicle });
    setVin(deal.vin || "");
    setResale(deal.resale);
    setParts(deal.parts);
    setLabor(deal.labor);
    setAuctionFees(deal.auctionFees);
    setTransport(deal.transport);
    setDetailing(deal.detailing);
    setReserve(deal.reserve);
    setProfit(deal.profit);
    setPurchase(deal.purchase);
    setVinMessage("");
    setMessage("Saved deal loaded into the calculator.");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Delete a saved deal
  function deleteDeal(id: number) {
    setDeals((current) =>
      current.filter((deal) => deal.id !== id)
    );
    setMessage("Deal deleted.");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-5 text-slate-900 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Header */}
        <header className="rounded-2xl bg-slate-950 p-7 text-white">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-300">
            Dealer Intelligence
          </p>

          <h1 className="mt-2 text-3xl font-bold md:text-4xl">
            Dealer AI Platform
          </h1>

          <p className="mt-3 text-slate-300">
            Find the right cars. Estimate repair costs. Buy for profit.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">

          {/* Vehicle information and VIN decoder */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">
              Vehicle Information
            </h2>

            <p className="mb-4 mt-2 text-sm text-slate-500">
              Decode the VIN or enter the vehicle details manually.
            </p>

            <div className="mb-5 rounded-xl bg-blue-50 p-4">
              <label className="block text-sm font-semibold">
                Vehicle Identification Number (VIN)

                <input
                  className={field}
                  value={vin}
                  maxLength={17}
                  placeholder="Enter 17-character VIN"
                  onChange={(e) => {
                    setVin(e.target.value.toUpperCase());
                    setVinMessage("");
                  }}
                />
              </label>

              <button
                onClick={decodeVin}
                disabled={decoding}
                className="mt-3 w-full rounded-lg bg-blue-700 p-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {decoding ? "Decoding VIN..." : "Decode VIN"}
              </button>

              {vinMessage && (
                <p className="mt-3 text-sm text-slate-700">
                  {vinMessage}
                </p>
              )}
            </div>

            <div className="space-y-3">
              {(
                [
                  ["year", "Year"],
                  ["make", "Make"],
                  ["model", "Model and trim"],
                  ["mileage", "Mileage"],
                  ["location", "City or ZIP code"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="block text-sm font-medium"
                >
                  {label}

                  <input
                    className={field}
                    value={vehicle[key]}
                    onChange={(e) =>
                      setVehicle({
                        ...vehicle,
                        [key]: e.target.value,
                      })
                    }
                  />
                </label>
              ))}
            </div>

            <p className="mt-4 text-xs text-slate-500">
              VIN decoding retrieves available manufacturer-reported
              vehicle details. It does not verify accident history,
              ownership, title status, or market value.
            </p>
          </section>

          {/* Deal calculator */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">
              Deal Calculator
            </h2>

            <p className="mb-4 mt-2 text-sm text-slate-500">
              Enter the expected selling price and estimated expenses.
            </p>

            {(
              [
                ["Expected resale price", resale, setResale],
                ["Parts", parts, setParts],
                ["Labor", labor, setLabor],
                ["Auction fees", auctionFees, setAuctionFees],
                ["Transportation", transport, setTransport],
                ["Detailing", detailing, setDetailing],
                ["Target profit", profit, setProfit],
                ["Your purchase price", purchase, setPurchase],
                ["Contingency reserve", reserve, setReserve],
              ] as const
            ).map(([label, value, setter]) => (
              <label
                key={label}
                className="mb-4 block text-sm font-medium"
              >
                {label} ($)

                <input
                  className={field}
                  type="number"
                  min="0"
                  step="100"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                />
              </label>
            ))}

            <div className="mb-4 rounded-xl bg-slate-100 p-4">
              <p className="text-sm text-slate-600">
                Total estimated costs, excluding purchase price
              </p>

              <p className="mt-1 text-2xl font-bold">
                {money(totalCosts)}
              </p>
            </div>

            <div className="rounded-xl bg-slate-950 p-5 text-white">
              <p className="text-sm text-slate-300">
                Maximum Purchase Price
              </p>

              <p className={`mt-1 text-4xl font-bold ${
                maxBuy >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}>
                {money(maxBuy)}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                Maximum amount to pay while meeting your profit target.
              </p>

              <div className="mt-4 border-t border-slate-700 pt-4">
                <p className="text-sm text-slate-300">
                  Projected Profit at Your Purchase Price
                </p>

                <p className={`mt-1 text-2xl font-bold ${
                  actualProfit >= Number(profit || 0)
                    ? "text-emerald-400"
                    : actualProfit >= 0
                      ? "text-yellow-400"
                      : "text-red-400"
                }`}>
                  {money(actualProfit)}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  {actualProfit < 0
                    ? "Warning: this deal is projected to lose money."
                    : actualProfit < Number(profit || 0)
                      ? "Projected profit is below your target."
                      : "This deal meets or exceeds your profit target."}
                </p>
              </div>

              <p className="mt-4 text-xs text-slate-400">
                Estimates only. Verify market value, inspection results,
                repair quotes, taxes, and applicable fees before buying.
              </p>
            </div>

            <button
              onClick={saveDeal}
              className="mt-5 w-full rounded-lg bg-emerald-600 p-3 font-semibold text-white hover:bg-emerald-700"
            >
              Save Current Deal
            </button>

            <p className="mt-3 text-xs text-slate-500">
              Saves the VIN, vehicle information, and financial estimates.
            </p>
          </section>
        </div>

        {/* Saved deals */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Saved Deals</h2>
              <p className="mt-1 text-sm text-slate-500">
                Review and compare the vehicles you have evaluated.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">
              {deals.length} {deals.length === 1 ? "deal" : "deals"}
            </span>
          </div>

          {message && (
            <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              {message}
            </p>
          )}

          {!storageLoaded ? (
            <p className="mt-5 text-sm text-slate-500">
              Loading saved deals...
            </p>
          ) : deals.length === 0 ? (
            <div className="mt-5 rounded-xl border-2 border-dashed border-slate-300 p-8 text-center">
              <p className="font-semibold">No deals saved yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Fill out the calculator and select Save Current Deal.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {deals.map((deal) => {
                const dealCosts =
                  Number(deal.parts || 0) +
                  Number(deal.labor || 0) +
                  Number(deal.auctionFees || 0) +
                  Number(deal.transport || 0) +
                  Number(deal.detailing || 0) +
                  Number(deal.reserve || 0);

                const dealProfit =
                  Number(deal.resale || 0) -
                  Number(deal.purchase || 0) -
                  dealCosts;

                const dealMaxBuy =
                  Number(deal.resale || 0) -
                  dealCosts -
                  Number(deal.profit || 0);

                return (
                  <article
                    key={deal.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold">
                          {deal.vehicle.year} {deal.vehicle.make}{" "}
                          {deal.vehicle.model}
                        </h3>

                        {deal.vin && (
                          <p className="mt-1 break-all text-xs text-slate-500">
                            VIN: {deal.vin}
                          </p>
                        )}

                        <p className="mt-1 text-sm text-slate-500">
                          {Number(deal.vehicle.mileage || 0).toLocaleString()} miles
                          {" · "}{deal.vehicle.location}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Saved {deal.savedAt}
                        </p>
                      </div>

                      <p className={`text-xl font-bold ${
                        dealProfit >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}>
                        {money(dealProfit)}
                        <span className="block text-xs font-normal text-slate-500">
                          Projected profit
                        </span>
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Buy price</p>
                        <p className="mt-1 font-semibold">
                          {money(Number(deal.purchase || 0))}
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Resale price</p>
                        <p className="mt-1 font-semibold">
                          {money(Number(deal.resale || 0))}
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Other costs</p>
                        <p className="mt-1 font-semibold">
                          {money(dealCosts)}
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Maximum buy</p>
                        <p className="mt-1 font-semibold">
                          {money(dealMaxBuy)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        onClick={() => loadDeal(deal)}
                        className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                      >
                        Load Deal
                      </button>

                      <button
                        onClick={() => deleteDeal(deal.id)}
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Upcoming features */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            AI Inspection and Vendor Quotes
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Planned features include photo-based damage assessment,
            repair quote requests, and searches for used or salvage parts.
          </p>

          <div className="mt-4 rounded-xl border-2 border-dashed border-slate-300 p-8 text-center">
            <p className="font-semibold">Vehicle Photo Scanner</p>
            <p className="mt-1 text-sm text-slate-500">
              Photo uploads and AI inspection are not connected yet.
            </p>
          </div>
        </section>

        <footer className="pb-4 text-center text-sm text-slate-500">
          Dealer AI Platform · Acquisition Intelligence for Used Cars
        </footer>
      </div>
    </main>
  );
}
