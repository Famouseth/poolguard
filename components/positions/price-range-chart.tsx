/**
 * PriceRangeChart — visual representation of a V3 position's price range.
 * Shows lower / upper ticks with the current price line,
 * plus a gradient fill (green=in-range, grey=out-of-range).
 */
"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  Bar,
} from "recharts";
import type { Pool, PoolDayData } from "@/types";
import { formatUSD } from "@/lib/utils";

interface PriceRangeChartProps {
  pool: Pool;
  priceLower: number;
  priceUpper: number;
  currentPrice: number;
  inRange: boolean;
  height?: number;
}

export function PriceRangeChart({
  pool,
  priceLower,
  priceUpper,
  currentPrice,
  inRange,
  height = 160,
}: PriceRangeChartProps) {
  const dayData: PoolDayData[] = (pool.poolDayData ?? []).slice(0, 30).reverse();

  // Build chart data from historical close prices
  const data = dayData.map((d) => ({
    date: new Date(d.date * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    price: d.close,
    volume: d.volumeUSD,
  }));

  if (data.length === 0) {
    // Fallback: show a minimal chart with just the current price
    data.push({ date: "Now", price: currentPrice, volume: 0 });
  }

  const minPrice = Math.min(...data.map((d) => d.price)) * 0.98;
  const maxPrice = Math.max(...data.map((d) => d.price)) * 1.02;

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />

          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => v.toFixed(v > 100 ? 0 : 4)}
            width={55}
          />

          <Tooltip
            contentStyle={{
              background: "hsl(222, 47%, 9%)",
              border: "1px solid hsl(217, 32%, 18%)",
              borderRadius: 6,
              fontSize: 11,
            }}
            formatter={(value: number, name: string) => [
              name === "price" ? value.toFixed(4) : formatUSD(value, true),
              name === "price" ? `${pool.token0.symbol}/${pool.token1.symbol}` : "Volume",
            ]}
          />

          {/* Price range zone */}
          <ReferenceArea
            y1={priceLower}
            y2={priceUpper}
            fill={inRange ? "#22c55e" : "#6b7280"}
            fillOpacity={0.12}
            stroke={inRange ? "#22c55e" : "#6b7280"}
            strokeOpacity={0.4}
            strokeDasharray="4 2"
          />

          {/* Lower bound */}
          <ReferenceLine
            y={priceLower}
            stroke={inRange ? "#22c55e" : "#6b7280"}
            strokeDasharray="4 2"
            strokeWidth={1}
            label={{ value: "L", position: "right", fontSize: 10, fill: "#6b7280" }}
          />

          {/* Upper bound */}
          <ReferenceLine
            y={priceUpper}
            stroke={inRange ? "#22c55e" : "#6b7280"}
            strokeDasharray="4 2"
            strokeWidth={1}
            label={{ value: "U", position: "right", fontSize: 10, fill: "#6b7280" }}
          />

          {/* Current price */}
          <ReferenceLine
            y={currentPrice}
            stroke="#3B82F6"
            strokeWidth={1.5}
            label={{
              value: "NOW",
              position: "right",
              fontSize: 9,
              fill: "#3B82F6",
              fontWeight: 600,
            }}
          />

          {/* Price line */}
          <Bar dataKey="price" fill="#3B82F6" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Range progress bar */}
      <div className="mt-2">
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>{priceLower.toFixed(priceLower > 100 ? 2 : 4)}</span>
          <span className="text-blue-400 font-medium">
            {currentPrice.toFixed(currentPrice > 100 ? 2 : 4)} (current)
          </span>
          <span>{priceUpper.toFixed(priceUpper > 100 ? 2 : 4)}</span>
        </div>
        <div className="relative h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              backgroundColor: inRange ? "#22c55e" : "#6b7280",
              width: `${Math.max(0, Math.min(100,
                ((currentPrice - priceLower) / (priceUpper - priceLower)) * 100
              ))}%`,
            }}
          />
          {/* Current price tick */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-blue-400"
            style={{
              left: `${Math.max(0, Math.min(100,
                ((currentPrice - priceLower) / (priceUpper - priceLower)) * 100
              ))}%`,
            }}
          />
        </div>
        <div className="flex justify-center mt-1">
          <span
            className={`text-[10px] font-semibold ${inRange ? "text-profit" : "text-muted-foreground"}`}
          >
            {inRange ? "● In Range" : "○ Out of Range"}
          </span>
        </div>
      </div>
    </div>
  );
}
