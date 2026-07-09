"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { vehicleSchema, type VehicleData } from "./schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  defaultValues: Partial<VehicleData>;
  onComplete: (data: VehicleData) => void;
  onBack: () => void;
}

export function StepVehicle({ defaultValues, onComplete, onBack }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VehicleData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      make: "",
      model: "",
      trim: "",
      vin: "",
      location_city: "",
      location_state: "",
      ...defaultValues,
    },
  });

  const drivable = watch("is_drivable"); // boolean | null | undefined

  function setDrivable(v: boolean | null) {
    setValue("is_drivable", v, { shouldValidate: true });
  }

  return (
    <form onSubmit={handleSubmit(onComplete)} noValidate>
      <div className="space-y-5">
        {/* Year / Make / Model */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="year">
              Year <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="year"
              type="number"
              inputMode="numeric"
              placeholder="2019"
              min={1900}
              max={new Date().getFullYear() + 2}
              aria-invalid={!!errors.year}
              {...register("year", {
                setValueAs: (v: unknown) =>
                  v === "" || v === null || v === undefined ? undefined : Number(v),
              })}
            />
            {errors.year && (
              <p className="text-xs text-destructive" role="alert">
                {errors.year.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="make">
              Make <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="make"
              type="text"
              placeholder="Toyota"
              aria-invalid={!!errors.make}
              {...register("make")}
            />
            {errors.make && (
              <p className="text-xs text-destructive" role="alert">
                {errors.make.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="model">
              Model <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="model"
              type="text"
              placeholder="Camry"
              aria-invalid={!!errors.model}
              {...register("model")}
            />
            {errors.model && (
              <p className="text-xs text-destructive" role="alert">
                {errors.model.message}
              </p>
            )}
          </div>
        </div>

        {/* Trim / VIN */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="trim">
              Trim{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="trim"
              type="text"
              placeholder="XSE, Limited, Sport…"
              {...register("trim")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vin">
              VIN{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="vin"
              type="text"
              placeholder="17-character VIN"
              maxLength={17}
              {...register("vin")}
            />
          </div>
        </div>

        {/* Mileage */}
        <div className="space-y-1.5">
          <Label htmlFor="mileage">
            Mileage{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="mileage"
            type="number"
            inputMode="numeric"
            placeholder="45000"
            min={0}
            aria-invalid={!!errors.mileage}
            {...register("mileage", {
              setValueAs: (v: unknown) =>
                v === "" || v === null || v === undefined ? null : Number(v),
            })}
          />
          {errors.mileage && (
            <p className="text-xs text-destructive" role="alert">
              {errors.mileage.message}
            </p>
          )}
        </div>

        {/* Location */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="location_city">
              City <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="location_city"
              type="text"
              placeholder="Seattle"
              aria-invalid={!!errors.location_city}
              {...register("location_city")}
            />
            {errors.location_city && (
              <p className="text-xs text-destructive" role="alert">
                {errors.location_city.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location_state">
              State <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="location_state"
              type="text"
              placeholder="WA"
              maxLength={2}
              className="uppercase"
              aria-invalid={!!errors.location_state}
              {...register("location_state", {
                onChange: (e) => {
                  e.target.value = e.target.value.toUpperCase();
                },
              })}
            />
            {errors.location_state && (
              <p className="text-xs text-destructive" role="alert">
                {errors.location_state.message}
              </p>
            )}
          </div>
        </div>

        {/* Is drivable — direct boolean toggle */}
        <div className="space-y-2">
          <Label>
            Is the vehicle currently drivable?{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <div className="flex gap-2">
            {(
              [
                { label: "Yes", value: true },
                { label: "No", value: false },
                { label: "N/A", value: null },
              ] as const
            ).map(({ label, value }) => (
              <button
                key={label}
                type="button"
                onClick={() => setDrivable(value)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  drivable === value
                    ? "border-brand-navy bg-brand-navy text-white"
                    : "border-border bg-transparent hover:bg-secondary/60"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
        <Button type="submit" className="bg-brand-navy text-white hover:bg-brand-navy-dark">
          Continue
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
