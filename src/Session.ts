import express from "express"
import jwt from "jsonwebtoken"
import { insertUser } from "./lib/InsertUser.js"
import prisma from "./lib/client.js"

const router = express.Router()

// validateEmailAndCode() function is used to verify email and verification code
async function validateEmailAndCode(email: string, code: string) {
  try {
    // look for the most recent validation_code for validation
    // default validation_code is 123456, to make testing easier
    const latestCode = (await prisma.user_validation.findFirst({
      where: {
        user_email: email
      },
      orderBy: {
        timestamp: "desc"
      }
    })) || { validation_code: "123456" }
    // TODO: this for testing purpose only, remove it in build
    return latestCode.validation_code === code || code === "123456"
  } catch (error) {
    throw new Error("An error occurred while validating email and code")
  }
}

function hello(string: string) {
  console.log(string)
}

router.post("/", async (req, res) => {
  const { email, code } = req.body // Extract email and code from request body
  try {
    const isValid = await validateEmailAndCode(email, code)
    if (isValid) {
      const secret = process.env.JWT_SECRET
      if (!secret) {
        throw new Error("No JWT secret found")
      }
      const token = jwt.sign({ email }, secret)
      res.status(200).json({ jwt: token })
      // insert user into user_info if not validation succeeded
      await insertUser({ email })
    } else {
      res.status(422).json({ errors: { email: ["Email or code is invalid"] } })
    }
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "An error occurred during verification" })
  } finally {
    await prisma.$disconnect() // Disconnect the Prisma client after all database operations are completed
  }
})

export default router
