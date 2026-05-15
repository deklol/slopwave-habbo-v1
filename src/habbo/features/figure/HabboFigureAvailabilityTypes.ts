export type HabboFigureAvailabilityMode = "source" | "expanded" | "custom";

export type HabboFigureAvailabilityGenderPolicy = "source" | "merged";

export type HabboFigureAvailabilityIncludeMode = "source" | "allValidated" | readonly string[];

export type HabboFigureAvailabilityColorMode = "source" | "sourceAndCustom" | readonly string[];

export interface HabboFigureAvailabilityPartPolicy {
  readonly include?: HabboFigureAvailabilityIncludeMode;
  readonly exclude?: readonly string[];
  readonly colors?: HabboFigureAvailabilityColorMode;
  readonly customColorGroups?: readonly string[];
  readonly tupleMode?: "sourceBase" | "synchronized" | "sourceBaseAndSynchronized";
}

export interface HabboFigureAvailabilityPolicy {
  readonly version: string;
  readonly mode?: HabboFigureAvailabilityMode;
  readonly genderPolicy?: HabboFigureAvailabilityGenderPolicy;
  readonly sourceFallback?: boolean;
  readonly parts?: Readonly<Record<string, HabboFigureAvailabilityPartPolicy>>;
  readonly customColors?: Readonly<Record<string, readonly string[]>>;
}
