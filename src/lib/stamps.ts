export interface StampDefinition {
  id: string;
  name: string;
  src: string;
  color: string;
}

export const STAMP_DEFINITIONS: StampDefinition[] = [
  {
    id: "approved",
    name: "ОДОБРЕНО",
    src: "/stamps/approved.png",
    color: "red",
  },
  {
    id: "confidential",
    name: "КОНФИДЕНЦИАЛЬНО",
    src: "/stamps/confidential.png",
    color: "red",
  },
  {
    id: "draft",
    name: "ЧЕРНОВИК",
    src: "/stamps/draft.png",
    color: "red",
  },
  {
    id: "paid",
    name: "ОПЛАЧЕНО",
    src: "/stamps/paid.png",
    color: "red",
  },
  {
    id: "review",
    name: "НА РАССМОТРЕНИИ",
    src: "/stamps/review.png",
    color: "blue",
  },
  {
    id: "verified",
    name: "ПРОВЕРЕНО",
    src: "/stamps/verified.png",
    color: "green",
  },
];
