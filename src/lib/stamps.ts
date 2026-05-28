export interface StampDefinition {
  id: string;
  name: string;
  src: string;
  color: string;
  category: "preset" | "custom";
}

export const STAMP_DEFINITIONS: StampDefinition[] = [
  // Preset stamps
  {
    id: "approved",
    name: "ОДОБРЕНО",
    src: "/stamps/approved.png",
    color: "red",
    category: "preset",
  },
  {
    id: "confidential",
    name: "КОНФИДЕНЦИАЛЬНО",
    src: "/stamps/confidential.png",
    color: "red",
    category: "preset",
  },
  {
    id: "draft",
    name: "ЧЕРНОВИК",
    src: "/stamps/draft.png",
    color: "red",
    category: "preset",
  },
  {
    id: "paid",
    name: "ОПЛАЧЕНО",
    src: "/stamps/paid.png",
    color: "red",
    category: "preset",
  },
  {
    id: "review",
    name: "НА РАССМОТРЕНИИ",
    src: "/stamps/review.png",
    color: "blue",
    category: "preset",
  },
  {
    id: "verified",
    name: "ПРОВЕРЕНО",
    src: "/stamps/verified.png",
    color: "green",
    category: "preset",
  },
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
    name: "Подпись 1",
    src: "/stamps/custom-signature-1.png",
    color: "blue",
    category: "custom",
  },
  {
    id: "custom-signature-2",
    name: "Подпись 2",
    src: "/stamps/custom-signature-2.png",
    color: "blue",
    category: "custom",
  },
];
