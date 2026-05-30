import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faArrowUpFromBracket, faSquarePlus } from '@fortawesome/free-solid-svg-icons';
import { useAddToHomeScreen } from '../context/AddToHomeScreenContext';

export default function AddToHomeScreenInstructions() {
  const { instructionsOpen, closeInstructions } = useAddToHomeScreen();
  if (!instructionsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={closeInstructions}
    >
      <div
        className="w-full sm:max-w-sm m-0 sm:m-4 rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl bg-[var(--theme-bgSecondary)] text-[var(--theme-text)] border border-[var(--theme-border)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src="/icons/icon-192.png" alt="Reddzit" className="w-10 h-10 rounded-xl" />
            <span className="font-serif text-lg font-bold">Add Reddzit to your Home Screen</span>
          </div>
          <button
            onClick={closeInstructions}
            aria-label="Close"
            className="border-none bg-transparent cursor-pointer text-[var(--theme-textMuted)] p-1"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <ol className="space-y-3 m-0 pl-0 list-none">
          <li className="flex items-center gap-3">
            <FontAwesomeIcon icon={faArrowUpFromBracket} className="text-[var(--theme-primary)] w-5" />
            <span>
              Tap the <strong>Share</strong> button in the Safari toolbar.
            </span>
          </li>
          <li className="flex items-center gap-3">
            <FontAwesomeIcon icon={faSquarePlus} className="text-[var(--theme-primary)] w-5" />
            <span>
              Choose <strong>Add to Home Screen</strong>.
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}
