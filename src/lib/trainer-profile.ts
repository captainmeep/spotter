import photo from "@/assets/scott.jpg";

// The trainer this Spotter site belongs to. Shown on the public home page.
// Edit this file to update the bio or certifications; replace the image in
// src/assets to change the photo.
export const trainerProfile = {
  name: "Scott Jackman",
  firstName: "Scott",
  role: "Personal trainer",
  location: "Portland, OR",
  experience: "Instructor since 2011",
  photo: {
    src: photo,
    alt: "Scott Jackman, smiling, in front of a brick wall",
  },
  intro:
    "Individual coaching that looks after your whole health: how you move, think, eat and recover.",
  bio: [
    "Scott grew up and received his education in Perth, Australia. Before moving to the United States and establishing his career in Portland in 2013, Scott travelled the world extensively for 7 years, visiting 19 countries. Scott became a US citizen in 2022.",
    "Scott believes in a very individual-based coaching style. He takes a holistic approach to health and fitness while implementing the Four Key Pillars of Success: movement, mindset, nourishment and regeneration. Scott works closely with his clients to improve their strength and conditioning, learning to set goals and increase discipline, to understand nutrition for their specific body, and to optimize their sleep, rest and recovery habits.",
    "Scott also has extensive experience with injury rehabilitation and corrective exercise.",
  ],
  pillars: [
    { title: "Movement", description: "Strength and conditioning built around your body and your goals." },
    { title: "Mindset", description: "Setting goals and building the discipline to reach them." },
    { title: "Nourishment", description: "Understanding nutrition for your specific body." },
    { title: "Regeneration", description: "Better sleep, rest and recovery habits." },
  ],
  certifications: [
    "Australian Institute of Fitness",
    "Master Trainer Level 1",
    "Certificate IV in Personal Training",
    "Certificate III in Fitness",
    "CPR / AED",
    "Massage therapist, specializing in sports and fitness (Australia)",
  ],
};
