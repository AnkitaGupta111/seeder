import mongoose from "mongoose";
import { CashkicksStatus } from "../utils/enums";
import { contractSchema } from "./contract";

export const cashkickSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: CashkicksStatus,
        required: true,
    },
    totalAmount: {
        type: mongoose.Types.Decimal128,
        required: true
    },
    totalFinanced: {
        type: mongoose.Types.Decimal128,
        required: true
    },
    contracts: {
        type: [contractSchema],
        required: true
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    }
})


export default mongoose.model("Cashkick", cashkickSchema)