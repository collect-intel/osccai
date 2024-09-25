import { VoteValue } from "@prisma/client";
import ThumbIcon from "../icons/ThumbIcon";
import QuestionIcon from "../icons/QuestionIcon";
import { motion } from "framer-motion";

type VoteButtonsProps = {
  onClick: (vote: VoteValue) => void;
  disabled: boolean;
  currentVote?: VoteValue;
};

export default function VoteButtons({ onClick, disabled, currentVote }: VoteButtonsProps) {
  return (
    <div className="space-x-2">
      {["AGREE", "DISAGREE", "PASS"].map((voteType) => (
        <motion.button
          key={voteType}
          className={`px-3 py-1 rounded ${
            currentVote === voteType
              ? "bg-teal text-white"
              : "bg-gray-200 text-gray-800"
          }`}
          onClick={() => onClick(voteType as VoteValue)}
          disabled={disabled}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {voteType === "AGREE" && <ThumbIcon className={`inline mr-1 ${currentVote === voteType ? "text-white" : ""}`} />}
          {voteType === "DISAGREE" && <ThumbIcon className={`inline mr-1 transform scale-y-[-1] ${currentVote === voteType ? "text-white" : ""}`} />}
          {voteType === "PASS" && <QuestionIcon className={`inline mr-1 ${currentVote === voteType ? "text-white" : ""}`} />}
          {voteType}
        </motion.button>
      ))}
    </div>
  );
}