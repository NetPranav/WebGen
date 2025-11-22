import { NextRequest, NextResponse } from "next/server";
import { connect } from "@/DataBase/mongo.config";
import { registerSchema } from "@/validator/authSchema";
import vine, { errors } from "@vinejs/vine";
import ErrorReporter from "@/validator/ErrorReporter";
import bcrypt from "bcryptjs";
import { User } from "@/model/user";
// for db connection
connect();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validator = vine.compile(registerSchema);
    validator.errorReporter = () => new ErrorReporter();
    const output = await validator.validate(body);

    // check if user already exists
    const user = await User.findOne({ email: output.email });
    if (user) {
      return NextResponse.json(
        {
          status: 400,
          errors: {
            email: "User with this email already exists",
          },
        },
        { status: 200 }
      );
    } else {
      // Enctrypting password
      const salt = bcrypt.genSaltSync(10);
      output.password = bcrypt.hashSync(output.password, salt);
      await User.create(output);
      return NextResponse.json({status:200, message:"Account Created Successfully"}, { status: 200 });
    }
  } catch (error) {
    if (error instanceof errors.E_VALIDATION_ERROR) {
      return NextResponse.json(
        { status: 400, errors: error.messages },
        { status: 200 }
      );
    }
  }
}
