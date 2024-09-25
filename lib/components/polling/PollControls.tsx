"use client";

import Link from "next/link";
import EditIcon from "@/lib/components/icons/EditIcon";
import { Poll } from "@prisma/client";
import ShareIcon from "@/lib/components/icons/ShareIcon";
import { copyToClipboard } from "@/lib/copyToClipboard";
import ResultsIcon from "@/lib/components/icons/ResultsIcon";
import { pollUrl } from "@/lib/links";
import Toast from "@/lib/components/Toast";
import { useToast } from "@/lib/useToast";
import Button from "@/lib/components/Button";
import { deletePoll } from "@/lib/actions"; // Import deletePoll function
import Modal from "@/lib/components/Modal"; // Import Modal component
import { useState } from "react";
import { useRouter } from 'next/navigation'; // Import useRouter

export const controlButtonStyle =
  "flex items-center gap-1.5 text-sm font-medium fill-none stroke-charcoal";

export default function PollControls({ poll }: { poll: Poll }) {
  const pollPath = `/polls/${poll.uid}`;
  const { isVisible, message, showToast } = useToast();
  const [showModal, setShowModal] = useState(false); // State for modal visibility
  const router = useRouter(); // Initialize router

  const handleShare = () => {
    const currentUrl = window.location.href;
    copyToClipboard(currentUrl);
    showToast("Link copied!");
  };

  const handleDelete = async () => {
    setShowModal(true); // Show the modal
  };

  const confirmDelete = async () => {
    await deletePoll(poll.uid); // Call deletePoll function
    setShowModal(false); // Close the modal
    router.push(`/community-models/${poll.communityModelId}`); // Redirect to Community Model page
  };

  return (
    <div className="flex justify-between items-center mb-4">
      <Link href={pollPath + "/edit"} className={controlButtonStyle}>
        <EditIcon />
        Edit
      </Link>
      <Link href={pollPath + "/results"} className={controlButtonStyle}>
        <ResultsIcon />
        Results
      </Link>
      <div className="relative">
        <Toast message={message} isVisible={isVisible} />
        <button className={controlButtonStyle} onClick={handleShare}>
          <ShareIcon />
          Share
        </button>
      </div>
      <Button title="Delete Poll" onClick={handleDelete} variant="danger">Delete Poll</Button>
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      >
        <h2 className="text-xl font-bold mb-4">Delete Poll</h2>
        <p className="mb-6">Are you sure you want to delete this poll? This action cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <Button onClick={() => setShowModal(false)} variant="secondary">
            Cancel
          </Button>
          <Button onClick={confirmDelete} variant="danger">
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
