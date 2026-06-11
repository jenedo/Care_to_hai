import { z } from "zod";



export const loginSchema = z.object({

  email: z.string().email().trim().toLowerCase(),

  password: z.string().min(1),

});



export const patientRegisterSchema = z.object({

  fullName: z.string().trim().min(2),

  email: z.string().email().trim().toLowerCase(),

  phone: z.string().trim().min(10),

  password: z.string().min(8),

});