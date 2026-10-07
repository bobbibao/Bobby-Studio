import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { useColorMode, Kbd } from '@chakra-ui/react';
import {
  Sparkles,
  Compass,
  FolderKanban,
  Heart,
  User,
  Moon,
  Sun,
  Laptop,
  HelpCircle,
  Image as ImageIcon,
  Zap,
  Cpu,
  Wand2,
  Sliders,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen: controlledOpen, onClose }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const { colorMode, toggleColorMode } = useColorMode();
  const navigate = useNavigate();

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (open: boolean) => {
    if (onClose && !open) onClose();
    setInternalOpen(open);
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!isOpen);
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setOpen(false);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [isOpen]);

  if (!isOpen) return null;

  const runCommand = (command: () => void) => {
    command();
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-md animate-fadeIn"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command Menu"
    >
      <div
        className="w-full max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command Menu" loop>
          <div className="flex items-center px-4 border-b border-black/10 dark:border-white/10">
            <Zap className="w-5 h-5 text-purple-500 mr-2 shrink-0" />
            <Command.Input
              placeholder="Type a command or search Bobby Studio..."
              autoFocus
            />
            <span className="text-xs text-zinc-400 shrink-0 ml-2">ESC to close</span>
          </div>

          <Command.List>
            <Command.Empty>No results found.</Command.Empty>

            <Command.Group heading="Create & Studio">
              <Command.Item
                onSelect={() => runCommand(() => navigate('/generate'))}
              >
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className="flex-1 font-medium">Open Studio Workspace</span>
                <span className="text-xs text-zinc-400">Image Generation</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/generate?tab=workspace&mode=generate'))}
              >
                <ImageIcon className="w-4 h-4 text-cyan-500" />
                <span className="flex-1">New Generation Session</span>
                <span className="text-xs text-zinc-400">Draft</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/models'))}
              >
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span className="flex-1 font-medium">AI Model Engines</span>
                <span className="text-xs text-zinc-400">Registry</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/prompts'))}
              >
                <Wand2 className="w-4 h-4 text-pink-400" />
                <span className="flex-1 font-medium">Prompt Matrix & Magic Expander</span>
                <span className="text-xs text-zinc-400">Library</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/lab'))}
              >
                <Sliders className="w-4 h-4 text-amber-400" />
                <span className="flex-1 font-medium">Creative Parameter Lab</span>
                <span className="text-xs text-zinc-400">Workbench</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Navigation">
              <Command.Item
                onSelect={() => runCommand(() => navigate('/inspiration'))}
              >
                <Compass className="w-4 h-4 text-blue-500" />
                <span className="flex-1">Inspiration Gallery</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/projects'))}
              >
                <FolderKanban className="w-4 h-4 text-amber-500" />
                <span className="flex-1">Projects & Assets</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/favorite'))}
              >
                <Heart className="w-4 h-4 text-rose-500" />
                <span className="flex-1">Favorite Creations</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/profile'))}
              >
                <User className="w-4 h-4 text-emerald-500" />
                <span className="flex-1">Account & Settings</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Preferences & Help">
              <Command.Item
                onSelect={() => runCommand(toggleColorMode)}
              >
                {colorMode === 'dark' ? (
                  <Sun className="w-4 h-4 text-yellow-400" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-400" />
                )}
                <span className="flex-1">
                  Switch to {colorMode === 'dark' ? 'Light' : 'Dark'} Mode
                </span>
                <span className="text-xs text-zinc-400">Theme</span>
              </Command.Item>
              <Command.Item
                onSelect={() =>
                  runCommand(() => window.open('https://bobby.ai/en/help-center', '_blank'))
                }
              >
                <HelpCircle className="w-4 h-4 text-zinc-400" />
                <span className="flex-1">Help & Documentation</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
};

export default CommandPalette;
