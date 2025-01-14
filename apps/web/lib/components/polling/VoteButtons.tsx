import { VoteValue } from "@prisma/client";
import ThumbIcon from "../icons/ThumbIcon";
import QuestionIcon from "../icons/QuestionIcon";

type VoteButtonsProps = {
  onClick: (vote: VoteValue) => void;
  disabled: boolean;
  currentVote?: VoteValue;
};

export default function VoteButtons({
  onClick,
  disabled,
  currentVote,
}: VoteButtonsProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-3 justify-center w-full">
        <button
          className={`px-5 py-1.5 rounded-md text-white text-sm flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
            currentVote === "AGREE"
              ? "bg-teal-700"
              : currentVote === "DISAGREE"
                ? "bg-teal/50"
                : "bg-teal"
          } ${disabled ? "opacity-50" : "hover:bg-teal-700"}`}
          onClick={() => onClick("AGREE")}
          disabled={disabled}
        >
          <ThumbIcon className="fill-white stroke-white w-3.5 h-3.5" />I agree
          {currentVote === "AGREE" && " (already voted)"}
        </button>

        <button
          className={`px-5 py-1.5 rounded-md text-white text-sm flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
            currentVote === "DISAGREE"
              ? "bg-teal-700"
              : currentVote === "AGREE"
                ? "bg-teal/50"
                : "bg-teal"
          } ${disabled ? "opacity-50" : "hover:bg-teal-700"}`}
          onClick={() => onClick("DISAGREE")}
          disabled={disabled}
        >
          <ThumbIcon className="fill-white stroke-white w-3.5 h-3.5 transform scale-y-[-1]" />
          I disagree{currentVote === "DISAGREE" && " (already voted)"}
        </button>
      </div>

      <button
        className={`text-gray hover:text-medium-gray text-xs ${
          currentVote === "PASS" ? "text-medium-gray" : ""
        } ${disabled ? "opacity-50" : ""}`}
        onClick={() => onClick("PASS")}
        disabled={disabled}
      >
        Skip, I'm not sure{currentVote === "PASS" && " (already voted)"}
      </button>
    </div>
  );
}
