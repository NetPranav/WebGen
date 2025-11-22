import { NextRequest, NextResponse } from "next/server";
import { connect } from "@/DataBase/mongo.config";
import { LoginSchema } from "@/validator/authSchema";
import vine, { errors } from "@vinejs/vine";
import ErrorReporter from "@/validator/ErrorReporter";
import bcrypt from "bcryptjs";
import { User } from "@/model/user";

// for db connection
connect();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validator = vine.compile(LoginSchema);
    validator.errorReporter = () => new ErrorReporter();
    const output = await validator.validate(body);

    // check if user exists
    const user = await User.findOne({ email: output.email });
    if (user) {
      const checkPassword = bcrypt.compareSync(output.password!, user.password);
      if (checkPassword) {
        return NextResponse.json(
          {
            status: 200,
            message: "Login Successful",
          },
          { status: 200 }
        );
      }
      return NextResponse.json(
        {
          status: 400,
          errors: {
            password: "Incorrect password",
          }
        },
        { status: 400 } // Changed to 400 status
      );
    }
    return NextResponse.json(
      {
        status: 400,
        errors: {
          email: "User with this email does not exist",
        },
      },
      { status: 400 } // Changed to 400 status
    );
  } catch (error) {
    if (error instanceof errors.E_VALIDATION_ERROR) {
      return NextResponse.json(
        { status: 400, errors: error.messages },
        { status: 400 } // Changed to 400 status
      );
    }
    
    // Handle any other unexpected errors
    console.error("Login error:", error);
    return NextResponse.json(
      {
        status: 500,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}