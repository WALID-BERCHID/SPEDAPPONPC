// Sample data for development and the screenshots in docs/USER_GUIDE.md.
// Only loaded in development builds (see main.tsx).
import { upsert, uid } from "./store";
import { daysAgo } from "./util";

export function loadDemo() {
  const sam = upsert("children", {
    firstName: "Sam", lastName: "Rivera", birthDate: "2018-03-14", color: "#3b6ea8", pronouns: "he/him", school: "Maple Grove Elementary, 2nd grade",
    diagnoses: "Autism (level 2), speech delay", strengths: "Great memory, loves numbers, kind to younger kids, builds amazing Lego towers",
    interests: "Trains, dinosaurs, counting, water play", likes: "Goldfish crackers, swings, stickers, music", dislikes: "Hand dryers, crowded rooms, wet clothes",
    communication: "Short phrases (2–3 words). Uses a picture board for new requests. Nods for yes.", sensory: "Sensitive to loud noise. Seeks deep pressure and movement.",
    triggers: "Sudden changes, waiting, loud alarms", calming: "Headphones, weighted lap pad, counting to 10 together, quiet corner",
    medical: "", allergies: "Peanuts (EpiPen in backpack)", medications: "Melatonin 1 mg at bedtime",
    contacts: [{ name: "Ana Rivera", relation: "Mom", phone: "(555) 201-3344" }, { name: "Luis Rivera", relation: "Dad", phone: "(555) 201-7788" }], notes: "",
  });
  upsert("children", {
    firstName: "Maya", lastName: "Chen", birthDate: "2016-11-02", color: "#c0567a", pronouns: "she/her", school: "", diagnoses: "Down syndrome",
    strengths: "Social, funny, loves drawing", interests: "", likes: "", dislikes: "", communication: "", sensory: "", triggers: "", calming: "", medical: "", allergies: "", medications: "", contacts: [], notes: "",
  });

  const g1 = upsert("goals", { childId: sam.id, title: "Asks for help using words or the picture board", area: "communication", plan: "IEP", description: "Practice during snack and play. Wait 5 seconds before prompting.", measure: "percent", lowerIsBetter: false, baseline: 20, target: 80, targetDate: "2027-06-01", status: "active" });
  const g2 = upsert("goals", { childId: sam.id, title: "Fewer meltdowns during transitions", area: "behavior", plan: "IEP", description: "Use the visual timer 2 minutes before each change.", measure: "count", lowerIsBetter: true, baseline: 6, target: 1, targetDate: "2027-06-01", status: "active" });
  const g3 = upsert("goals", { childId: sam.id, title: "Brushes teeth with picture routine", area: "selfCare", plan: "Home goal", description: "", measure: "rating", lowerIsBetter: false, baseline: 1, target: 5, targetDate: "", status: "active" });
  const pct = [25, 30, 28, 40, 45, 42, 55, 60, 58, 66, 70, 72];
  const cnt = [6, 5, 6, 4, 4, 3, 4, 3, 2, 2, 3, 2];
  const rat = [1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4];
  const prompts = ["full", "partial", "partial", "model", "verbal", "verbal", "gestural", "gestural", "verbal", "gestural", "independent", "independent"] as const;
  for (let i = 0; i < 12; i++) {
    const date = daysAgo(44 - i * 4);
    const total = 10;
    upsert("dataPoints", { goalId: g1.id, childId: sam.id, date, value: pct[i], correct: Math.round(pct[i] / 10), total, prompt: prompts[i], note: "" });
    upsert("dataPoints", { goalId: g2.id, childId: sam.id, date, value: cnt[i], note: "" });
    upsert("dataPoints", { goalId: g3.id, childId: sam.id, date, value: rat[i], note: "" });
  }

  const beh = ["Meltdown", "Meltdown", "Screaming", "Running away", "Meltdown", "Throwing things"];
  const before = ["Transition", "Transition", "Loud noise", "Waiting", "Told no", "Transition"];
  const after = ["Calm-down space", "Break given", "Redirected", "Comforted", "Planned ignoring", "Calm-down space"];
  for (let i = 0; i < 26; i++) {
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(i * 1.1));
    d.setHours([8, 13, 14, 15, 16, 18][i % 6], (i * 17) % 60, 0, 0);
    upsert("behaviors", { childId: sam.id, at: d.toISOString(), behavior: beh[i % 6], antecedent: before[(i * 5) % 6], consequence: after[i % 6], intensity: 2 + (i % 3), minutes: 3 + (i % 8), setting: i % 3 === 0 ? "school" : "home", fn: "escape", notes: "" });
  }

  const highlights = ["Said 'help please' at snack!", "Played with a classmate for 10 minutes", "Tried a new food (carrots)", "Used the timer without prompting", "Great swimming lesson"];
  for (let i = 0; i < 14; i++) {
    const date = daysAgo(i);
    upsert("dailyLogs", { childId: sam.id, date, setting: "home", author: "Ana", mood: [4, 3, 5, 4, 2, 4, 3][i % 7], sleepHours: [9, 7, 9.5, 8.5, 6.5, 9, 7.5][i % 7], meals: { breakfast: "all", lunch: "some", dinner: i % 3 ? "all" : "some" }, toileting: "", medsGiven: "Melatonin 1 mg", activities: "Park, reading", highlights: highlights[i % 5], concerns: i % 4 === 1 ? "Woke up at 3am, hard morning" : "", message: i === 0 ? "Sam slept badly — he may need extra breaks today. Thank you!" : "" });
    if (i % 2 === 0) upsert("dailyLogs", { childId: sam.id, date, setting: "school", author: "Ms. Johnson", mood: [4, 5, 3][i % 3], sleepHours: null, meals: { breakfast: "", lunch: "all", dinner: "" }, toileting: "Independent", medsGiven: "", activities: "Circle time, math centers, music", highlights: "Counted to 50 in front of the class", concerns: "", message: i === 2 ? "We're practicing the new fire drill social story this week." : "" });
  }

  const step = (emoji: string, label: string, minutes: number | null = null) => ({ id: uid(), emoji, label, minutes });
  upsert("schedules", { childId: sam.id, title: "Morning routine", kind: "schedule", steps: [step("🚽", "Toilet"), step("👕", "Get dressed"), step("🥣", "Breakfast", 15), step("🪥", "Brush teeth"), step("👟", "Shoes on"), step("🚌", "Bus")] });
  upsert("schedules", { childId: sam.id, title: "Homework then trains", kind: "firstThen", steps: [step("📚", "Homework", 10), step("🚂", "Train time", 15)] });
  upsert("checklists", { childId: sam.id, title: "Before the IEP meeting (Nov 12)", items: [
    ["Ask for the draft plan and reports a few days before", true], ["Print the progress report from this app", true], ["Write down Sam's strengths", true],
    ["List my top 3 concerns", false], ["Ask about speech therapy minutes", false], ["Bring the All About Me page", false],
  ].map(([text, done]) => ({ id: uid(), text: text as string, done: done as boolean })) });
  upsert("stories", { childId: sam.id, title: "Going to the dentist", pages: [["🦷", "Sometimes I go to the dentist."], ["🧸", "I sit in the waiting room. I can play with my train while I wait."], ["🪑", "I sit in a big chair. It can move up and down."], ["🔟", "I open my mouth and count to 10."], ["⭐", "When it is finished, I get a sticker!"]].map(([emoji, text]) => ({ id: uid(), emoji, text })) });
  upsert("boards", { childId: sam.id, title: "Core words", buttons: [["🙋", "I", "#ffe066"], ["🤲", "want", "#b7e4a7"], ["➕", "more", "#a5d8ff"], ["✋", "stop", "#ffb3b3"], ["🆘", "help", "#ffc9de"], ["👍", "yes", "#ffc9de"], ["👎", "no", "#ffc9de"], ["🍽️", "eat", "#b7e4a7"], ["🥤", "drink", "#b7e4a7"], ["🚽", "toilet", "#ffd8a8"], ["🧸", "play", "#b7e4a7"], ["✅", "all done", "#ffb3b3"], ["🛋️", "break", "#b7e4a7"], ["🚂", "train", "#ffd8a8"], ["😊", "happy", "#a5d8ff"], ["😢", "sad", "#a5d8ff"], ["👩", "Mom", "#ffe066"], ["🌳", "outside", "#ffd8a8"]].map(([emoji, label, color]) => ({ id: uid(), emoji, label, color })) });
  upsert("rewardCharts", { childId: sam.id, title: "Calm hands at school", goal: 5, earned: 3, token: "🚂", reward: "Train museum trip", rewardEmoji: "🚂", completedCount: 2 });
  const at = (days: number, hour: number) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(hour, 0, 0, 0); return d.toISOString(); };
  upsert("health", { childId: sam.id, type: "appointment", at: at(3, 15), title: "Speech therapy — Dr. Patel", details: "Bring the picture board", minutes: 45 });
  upsert("health", { childId: sam.id, type: "appointment", at: at(9, 10), title: "Paediatrician check-up", details: "", minutes: 30 });
  upsert("health", { childId: sam.id, type: "medication", at: at(0, 20), title: "Melatonin 1 mg", details: "", minutes: null });
  upsert("health", { childId: sam.id, type: "sleep", at: at(-1, 7), title: "Woke up twice", details: "Back to sleep with white noise", minutes: 480 });
  upsert("health", { childId: sam.id, type: "illness", at: at(-6, 9), title: "Mild cold", details: "Stayed home", minutes: null });
  upsert("feelings", { childId: sam.id, at: at(0, 9), feeling: "happy" });
  localStorage.setItem("hih.child", sam.id);
}
