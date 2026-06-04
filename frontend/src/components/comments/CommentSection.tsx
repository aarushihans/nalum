import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquare,
  PencilLine,
  Send,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import MentionTextarea from "@/components/MentionTextarea";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { parseFormattedText } from "@/lib/textFormatting";
import { cn } from "@/lib/utils";
import {
  CommentItem,
  createCommentReply,
  createPostComment,
  deletePostComment,
  fetchPostComments,
  updatePostComment,
} from "@/lib/comments";

interface CommentSectionProps {
  postId: string;
}

function CommentComposer({
  value,
  onChange,
  onSubmit,
  submitLabel,
  isSubmitting,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => Promise<void> | void;
  submitLabel: string;
  isSubmitting: boolean;
  placeholder: string;
}) {
  return (
    <div className="space-y-3">
      <MentionTextarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="min-h-[110px] bg-slate-950/60 border-white/10 rounded-xl"
      />
      <div className="flex justify-end">
        <Button
          onClick={onSubmit}
          disabled={isSubmitting || !value.trim()}
          className="bg-[#800000] hover:bg-[#600000] text-white"
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

function CommentCard({
  comment,
  postId,
  onChanged,
  depth = 0,
}: {
  comment: CommentItem;
  postId: string;
  onChanged: () => Promise<void>;
  depth?: number;
}) {
  const { user } = useAuth();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyValue, setReplyValue] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(comment.content || "");
  const [isSaving, setIsSaving] = useState(false);
  const [showReplies, setShowReplies] = useState(true);

  const isOwner = user?.user_id === comment.author?._id;
  const canManage = isOwner || user?.role === "admin";
  const displayContent = comment.isDeleted
    ? "This comment was deleted."
    : comment.content || "";

  const handleReply = async () => {
    if (!replyValue.trim()) return;

    try {
      setIsReplying(true);
      await createCommentReply(postId, comment._id, replyValue.trim());
      setReplyValue("");
      setReplyOpen(false);
      await onChanged();
    } catch (error) {
      console.error("Failed to reply:", error);
      toast.error("Failed to send reply");
    } finally {
      setIsReplying(false);
    }
  };

  const handleUpdate = async () => {
    if (!editValue.trim()) return;

    try {
      setIsSaving(true);
      await updatePostComment(postId, comment._id, editValue.trim());
      setIsEditing(false);
      await onChanged();
    } catch (error) {
      console.error("Failed to update comment:", error);
      toast.error("Failed to update comment");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsSaving(true);
      await deletePostComment(postId, comment._id);
      await onChanged();
    } catch (error) {
      console.error("Failed to delete comment:", error);
      toast.error("Failed to delete comment");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenReply = () => {
    setReplyOpen((value) => !value);

    if (!replyOpen && !replyValue.trim()) {
      const authorName = comment.author?.name || "";
      if (authorName) {
        setReplyValue(`@${authorName} `);
      }
    }
  };

  return (
    <div className={cn("space-y-3", depth > 0 && "pl-4 sm:pl-6 border-l border-white/10")}>
      <div className="flex gap-3">
        <Link
          to={`/dashboard/alumni/${comment.author?._id || comment.authorId}`}
          className="shrink-0 mt-1"
        >
          <UserAvatar src={undefined} name={comment.author?.name || "User"} size="sm" />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link
                  to={`/dashboard/alumni/${comment.author?._id || comment.authorId}`}
                  className="font-semibold text-white hover:text-blue-300 transition-colors"
                >
                  {comment.author?.name || "Unknown user"}
                </Link>
                <div className="text-xs text-gray-400 mt-1">
                  {formatDistanceToNow(new Date(comment.createdAt), {
                    addSuffix: true,
                  })}
                  {comment.editedAt ? " · edited" : ""}
                </div>
              </div>

              {canManage && !comment.isDeleted && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-blue-300"
                    onClick={() => {
                      setEditValue(comment.content || "");
                      setIsEditing((value) => !value);
                    }}
                  >
                    <PencilLine className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-red-300"
                    onClick={handleDelete}
                    disabled={isSaving}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-3 text-sm text-gray-200 whitespace-pre-wrap break-words">
              {isEditing ? (
                <div className="space-y-3">
                  <MentionTextarea
                    value={editValue}
                    onChange={setEditValue}
                    className="min-h-[96px] bg-slate-950/70 border-white/10 rounded-xl"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => setIsEditing(false)}
                      className="text-gray-300 hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpdate}
                      disabled={isSaving || !editValue.trim()}
                      className="bg-[#800000] hover:bg-[#600000] text-white"
                    >
                      {isSaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Save
                    </Button>
                  </div>
                </div>
              ) : comment.isDeleted ? (
                <span className="italic text-gray-500">{displayContent}</span>
              ) : (
                <div>{parseFormattedText(displayContent)}</div>
              )}
            </div>

            {!comment.isDeleted && (
              <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                <button
                  type="button"
                  onClick={handleOpenReply}
                  className="hover:text-blue-300 transition-colors font-medium"
                >
                  Reply
                </button>
                {comment.replies.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowReplies((value) => !value)}
                    className="hover:text-blue-300 transition-colors font-medium flex items-center gap-1"
                  >
                    {showReplies ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                    {showReplies
                      ? "Hide replies"
                      : `View replies (${comment.replies.length})`}
                  </button>
                )}
              </div>
            )}
          </div>

          {replyOpen && (
            <div className="mt-3">
              <div className="space-y-2">
                <div className="text-xs text-gray-400 flex items-center gap-2">
                  <span>Replying to</span>
                  <span className="text-blue-300 font-medium">@{comment.author?.name || "user"}</span>
                </div>
                <CommentComposer
                  value={replyValue}
                  onChange={setReplyValue}
                  onSubmit={handleReply}
                  submitLabel="Reply"
                  isSubmitting={isReplying}
                  placeholder={`Reply to ${comment.author?.name || "this comment"}...`}
                />
              </div>
            </div>
          )}

          {showReplies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4">
              {comment.replies.map((reply) => (
                <CommentCard
                  key={reply._id}
                  comment={reply}
                  postId={postId}
                  onChanged={onChanged}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CommentSection({ postId }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentValue, setCommentValue] = useState("");

  const loadComments = async () => {
    try {
      setIsLoading(true);
      const data = await fetchPostComments(postId);
      setComments(data.comments || []);
    } catch (error) {
      console.error("Failed to load comments:", error);
      toast.error("Failed to load comments");
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [postId]);

  const handleCreateComment = async () => {
    if (!commentValue.trim()) return;

    try {
      setIsSubmitting(true);
      await createPostComment(postId, commentValue.trim());
      setCommentValue("");
      await loadComments();
    } catch (error) {
      console.error("Failed to create comment:", error);
      toast.error("Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mt-5 sm:mt-6 bg-slate-900/50 border-white/10 backdrop-blur-sm">
      <CardContent className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[#a33]" />
          <h2 className="text-lg font-semibold text-white">Comments</h2>
          <span className="text-sm text-gray-400">{comments.length}</span>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-300">Add a comment</p>
          <CommentComposer
            value={commentValue}
            onChange={setCommentValue}
            onSubmit={handleCreateComment}
            submitLabel="Comment"
            isSubmitting={isSubmitting}
            placeholder="Write a comment. Use @name to mention someone."
          />
        </div>

        <div className="space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-gray-400">
              No comments yet. Be the first to start the conversation.
            </div>
          ) : (
            comments.map((comment) => (
              <CommentCard
                key={comment._id}
                comment={comment}
                postId={postId}
                onChanged={loadComments}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}