import PatModeToggle, { type PatModeToggleOption } from "@/app/components/pat/PatModeToggle";

export type PortalPanelOption = PatModeToggleOption & {
  href: string;
};

type PortalPanelSelectorProps = {
  activeKey: string;
  options: readonly PortalPanelOption[];
};

export default function PortalPanelSelector({
  activeKey,
  options,
}: PortalPanelSelectorProps) {
  return (
    <PatModeToggle
      activeKey={activeKey}
      ariaLabel="Portal sections"
      options={options}
    />
  );
}
