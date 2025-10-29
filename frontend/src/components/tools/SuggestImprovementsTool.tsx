"use client";

import type {ToolCallMessagePartComponent} from "@assistant-ui/react";
import {useLangGraphSendCommand} from "@assistant-ui/react-langgraph";
import {CheckCircle2, Edit2, Plus, Save, Trash2, X} from "lucide-react";
import {useState} from "react";
import {Button} from "../ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "../ui/card";
import {Checkbox} from "../ui/checkbox";
import {Input} from "../ui/input";

export const SuggestImprovementsTool: ToolCallMessagePartComponent = ({
  argsText
}) => {
  const sendCommand = useLangGraphSendCommand();
  const [submitted, setSubmitted] = useState(false);
  const [selectedImprovements, setSelectedImprovements] = useState<Set<number>>(
    new Set()
  );
  const [improvements, setImprovements] = useState<string[]>(
    JSON.parse(argsText).improvements
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [newImprovement, setNewImprovement] = useState("");
  const [showAddNew, setShowAddNew] = useState(false);

  const handleImprovementToggle = (index: number) => {
    setSelectedImprovements((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditingText(improvements[index]);
  };

  const handleSave = (index: number) => {
    const newImprovements = [...improvements];
    newImprovements[index] = editingText;
    setImprovements(newImprovements);
    setEditingIndex(null);
    setEditingText("");
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditingText("");
  };

  const handleDelete = (index: number) => {
    const newImprovements = improvements.filter((_, i) => i !== index);
    setImprovements(newImprovements);

    const newSelected = new Set(selectedImprovements);
    newSelected.delete(index);

    const adjustedSelected = new Set<number>();
    newSelected.forEach((i) => {
      if (i > index) {
        adjustedSelected.add(i - 1);
      } else if (i < index) {
        adjustedSelected.add(i);
      }
    });
    setSelectedImprovements(adjustedSelected);
  };

  const handleAddNew = () => {
    if (newImprovement.trim()) {
      setImprovements([...improvements, newImprovement.trim()]);
      setNewImprovement("");
      setShowAddNew(false);
    }
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const selectedItems = improvements.filter((_, index) =>
      selectedImprovements.has(index)
    );
    sendCommand({
      resume: JSON.stringify(selectedItems)
    });
  };

  return (
    <div className="aui-assistant-message-root relative mx-auto w-full max-w-[var(--thread-max-width)] animate-in py-4 duration-200 fade-in slide-in-from-bottom-1">
      <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Improvements
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Select Improvements to Apply ({selectedImprovements.size}{" "}
                selected)
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddNew(!showAddNew)}
                className="flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Add New
              </Button>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 border border-border">
              {showAddNew && (
                <div className="mb-3 p-3 bg-background rounded-lg border">
                  <div className="flex gap-2">
                    <Input
                      value={newImprovement}
                      onChange={(e) => setNewImprovement(e.target.value)}
                      placeholder="Enter new improvement..."
                      className="flex-1"
                    />
                    <Button size="sm" onClick={handleAddNew}>
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowAddNew(false);
                        setNewImprovement("");
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              {improvements.length > 0 ? (
                <div className="space-y-3">
                  {improvements.map((improvement, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-2 rounded hover:bg-background/50 transition-colors"
                    >
                      <Checkbox
                        id={`improvement-${index}`}
                        checked={selectedImprovements.has(index)}
                        onCheckedChange={() => handleImprovementToggle(index)}
                        className="mt-0.5"
                      />
                      {editingIndex === index ? (
                        <div className="flex-1 flex gap-2">
                          <Input
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="flex-1"
                          />
                          <Button size="sm" onClick={() => handleSave(index)}>
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <label
                            htmlFor={`improvement-${index}`}
                            className="text-sm leading-relaxed text-foreground cursor-pointer flex-1"
                          >
                            {improvement}
                          </label>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(index)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(index)}
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No improvements suggested.
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 w-full pt-2">
            {!submitted ? (
              <>
                <Button
                  onClick={handleSubmit}
                  className="flex-1"
                  size="lg"
                  disabled={selectedImprovements.size === 0}
                >
                  Apply Selected ({selectedImprovements.size})
                </Button>
              </>
            ) : (
              <div className="flex items-center justify-center w-full gap-2 py-2">
                <p className="text-sm text-muted-foreground font-medium">
                  Processing your request...
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
