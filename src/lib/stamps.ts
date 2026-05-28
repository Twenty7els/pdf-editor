export interface StampDefinition {
  id: string;
  name: string;
  src: string;
  color: string;
  category: "preset" | "custom";
}

export const STAMP_DEFINITIONS: StampDefinition[] = [
  // Custom stamps — user's own stamps
  {
    id: "custom-seal-ooo",
    name: "Печать ООО",
    src: "/stamps/custom-seal-ooo.png",
    color: "blue",
    category: "custom",
  },
  {
    id: "custom-signature-1",
    name: "Литвинкин",
    src: "/stamps/custom-signature-1.png",
    color: "blue",
    category: "custom",
  },
  {
    id: "custom-signature-2",
    name: "Вегеш",
    src: "/stamps/custom-signature-2.png",
    color: "blue",
    category: "custom",
  },
];
