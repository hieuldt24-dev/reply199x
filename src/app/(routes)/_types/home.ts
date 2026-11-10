export type MemoryTrack = Readonly<{ id:string; number:string; label:string; title:string; description:string }>;
export type UpcomingProduct = Readonly<{ id:string; symbol:string; stamp:string; title:string; description:string; material:string; status:string }>;
export type AttendanceStep = Readonly<{ id:string; number:number; label:string; symbol:string; title:string; description:string; note:string }>;
export type EventContent = Readonly<{ id:string; date:string; venue:string; time:string }>;
export type MerchCombo = Readonly<{ id:string; title:string; price:string; originalPrice:string }>;
