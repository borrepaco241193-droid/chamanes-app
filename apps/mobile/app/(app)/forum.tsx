import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Alert,
  ActivityIndicator, Image, FlatList, KeyboardAvoidingView, Platform, Modal,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuthStore } from '../../src/stores/auth.store'
import {
  useForumPosts, useCreatePost, useDeletePost, useToggleLike,
  useForumComments, useAddComment, useDeleteComment,
} from '../../src/hooks/useForum'
import type { ForumPost, ForumComment } from '../../src/services/forum.service'

// ── Avatar ────────────────────────────────────────────────────

function Avatar({ url, name, size = 36 }: { url?: string; name: string; size?: number }) {
  const initial = name?.[0]?.toUpperCase() ?? '?'
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: '#3B82F620', alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: '#3B82F640', overflow: 'hidden',
    }}>
      {url
        ? <Image source={{ uri: url }} style={{ width: size, height: size }} />
        : <Text style={{ color: '#3B82F6', fontWeight: '700', fontSize: size * 0.4 }}>{initial}</Text>
      }
    </View>
  )
}

// ── Comments Modal ─────────────────────────────────────────────

function CommentsModal({
  post, visible, onClose,
}: { post: ForumPost | null; visible: boolean; onClose: () => void }) {
  const { user } = useAuthStore()
  const { data: comments = [], isLoading } = useForumComments(post?.id ?? '')
  const addComment = useAddComment(post?.id ?? '')
  const deleteComment = useDeleteComment()
  const [text, setText] = useState('')

  const isAdmin = ['COMMUNITY_ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(
    user?.communityRole ?? user?.role ?? '',
  )

  async function handleSend() {
    const trimmed = text.trim()
    if (!trimmed) return
    try {
      await addComment.mutateAsync(trimmed)
      setText('')
    } catch {
      Alert.alert('Error', 'No se pudo enviar el comentario')
    }
  }

  function handleDeleteComment(c: ForumComment) {
    if (c.authorId !== user?.id && !isAdmin) return
    Alert.alert('Eliminar comentario', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: () => deleteComment.mutate(c.id),
      },
    ])
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1E293B' }}>
          <Text style={{ color: 'white', fontSize: 17, fontWeight: '700' }}>Comentarios</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* List */}
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#3B82F6" />
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(c) => c.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            ListEmptyComponent={
              <Text style={{ color: '#475569', textAlign: 'center', marginTop: 40 }}>
                Sin comentarios aún. ¡Sé el primero!
              </Text>
            }
            renderItem={({ item: c }) => (
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <Avatar url={c.author.avatarUrl} name={`${c.author.firstName} ${c.author.lastName}`} size={32} />
                <View style={{ flex: 1, backgroundColor: '#1E293B', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#334155' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>
                      {c.author.firstName} {c.author.lastName}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: '#475569', fontSize: 11 }}>
                        {formatDistanceToNow(new Date(c.createdAt), { locale: es, addSuffix: true })}
                      </Text>
                      {(c.authorId === user?.id || isAdmin) && (
                        <TouchableOpacity onPress={() => handleDeleteComment(c)}>
                          <Ionicons name="trash-outline" size={14} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <Text style={{ color: '#CBD5E1', fontSize: 13 }}>{c.body}</Text>
                </View>
              </View>
            )}
          />
        )}

        {/* Input */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#1E293B', flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
            <Avatar url={user?.avatarUrl} name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} size={34} />
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#1E293B', borderRadius: 20, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 14, paddingVertical: 8 }}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Escribe un comentario…"
                placeholderTextColor="#475569"
                multiline
                style={{ flex: 1, color: 'white', fontSize: 14, maxHeight: 100 }}
              />
              <TouchableOpacity onPress={handleSend} disabled={addComment.isPending || !text.trim()} style={{ marginLeft: 8 }}>
                {addComment.isPending
                  ? <ActivityIndicator size="small" color="#3B82F6" />
                  : <Ionicons name="send" size={20} color={text.trim() ? '#3B82F6' : '#334155'} />
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

// ── Post Card ──────────────────────────────────────────────────

function PostCard({
  post, currentUserId, isAdmin,
  onDelete, onLike, onComment,
}: {
  post: ForumPost
  currentUserId: string
  isAdmin: boolean
  onDelete: (p: ForumPost) => void
  onLike: (p: ForumPost) => void
  onComment: (p: ForumPost) => void
}) {
  const authorName = `${post.author.firstName} ${post.author.lastName}`
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { locale: es, addSuffix: true })
  const canDelete = post.authorId === currentUserId || isAdmin

  return (
    <View style={{ backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' }}>
      {/* Author row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Avatar url={post.author.avatarUrl} name={authorName} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>{authorName}</Text>
          <Text style={{ color: '#475569', fontSize: 12 }}>{timeAgo}</Text>
        </View>
        {canDelete && (
          <TouchableOpacity onPress={() => onDelete(post)} style={{ padding: 4 }}>
            <Ionicons name="trash-outline" size={17} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      {/* Body */}
      <Text style={{ color: '#CBD5E1', fontSize: 14, lineHeight: 20, marginBottom: post.imageUrl ? 10 : 0 }}>
        {post.body}
      </Text>

      {/* Image */}
      {post.imageUrl && (
        <Image
          source={{ uri: post.imageUrl }}
          style={{ width: '100%', height: 200, borderRadius: 10, marginTop: 10 }}
          resizeMode="cover"
        />
      )}

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 20, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#334155' }}>
        <TouchableOpacity onPress={() => onLike(post)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons
            name={post.likedByMe ? 'heart' : 'heart-outline'}
            size={20}
            color={post.likedByMe ? '#EF4444' : '#64748B'}
          />
          <Text style={{ color: post.likedByMe ? '#EF4444' : '#64748B', fontSize: 13 }}>
            {post.likesCount}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onComment(post)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="chatbubble-outline" size={19} color="#64748B" />
          <Text style={{ color: '#64748B', fontSize: 13 }}>{post._count.comments}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── Main Screen ────────────────────────────────────────────────

export default function ForumScreen() {
  const { user } = useAuthStore()
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isRefetching } = useForumPosts()
  const createPost = useCreatePost()
  const deletePost = useDeletePost()
  const toggleLike = useToggleLike()

  const [newPostText, setNewPostText] = useState('')
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null)
  const [showComments, setShowComments] = useState(false)

  const isAdmin = ['COMMUNITY_ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(
    user?.communityRole ?? user?.role ?? '',
  )

  const allPosts = data?.pages.flatMap((p) => p.posts) ?? []

  async function handleCreatePost() {
    const trimmed = newPostText.trim()
    if (!trimmed) return
    if (trimmed.length > 2000) {
      Alert.alert('Error', 'El mensaje no puede exceder 2000 caracteres')
      return
    }
    try {
      await createPost.mutateAsync({ body: trimmed })
      setNewPostText('')
    } catch {
      Alert.alert('Error', 'No se pudo publicar el mensaje')
    }
  }

  function handleDeletePost(post: ForumPost) {
    Alert.alert('Eliminar publicación', '¿Seguro que deseas eliminar esta publicación?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: () => deletePost.mutate(post.id),
      },
    ])
  }

  function handleLike(post: ForumPost) {
    toggleLike.mutate(post.id)
  }

  function handleComment(post: ForumPost) {
    setSelectedPost(post)
    setShowComments(true)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>Foro comunitario</Text>
          <Text style={{ color: '#475569', fontSize: 12 }}>Comparte con tu comunidad</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={allPosts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3B82F6" />}
          ListHeaderComponent={
            /* Compose box */
            <View style={{ backgroundColor: '#1E293B', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#334155' }}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <Avatar url={user?.avatarUrl} name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} />
                <TextInput
                  value={newPostText}
                  onChangeText={setNewPostText}
                  placeholder="¿Qué quieres compartir con la comunidad?"
                  placeholderTextColor="#475569"
                  multiline
                  style={{ flex: 1, color: 'white', fontSize: 14, minHeight: 60, maxHeight: 140 }}
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                <TouchableOpacity
                  onPress={handleCreatePost}
                  disabled={createPost.isPending || !newPostText.trim()}
                  style={{
                    backgroundColor: newPostText.trim() ? '#3B82F6' : '#1E3A5F',
                    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8,
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                  }}
                >
                  {createPost.isPending
                    ? <ActivityIndicator size="small" color="white" />
                    : <>
                        <Ionicons name="send" size={15} color="white" />
                        <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>Publicar</Text>
                      </>
                  }
                </TouchableOpacity>
              </View>
            </View>
          }
          ListEmptyComponent={
            isLoading
              ? <View style={{ alignItems: 'center', marginTop: 60 }}><ActivityIndicator color="#3B82F6" size="large" /></View>
              : (
                <View style={{ alignItems: 'center', marginTop: 60 }}>
                  <Ionicons name="chatbubbles-outline" size={52} color="#1E293B" />
                  <Text style={{ color: '#475569', fontSize: 16, marginTop: 16, fontWeight: '600' }}>Sin publicaciones aún</Text>
                  <Text style={{ color: '#334155', fontSize: 13, marginTop: 6, textAlign: 'center' }}>Sé el primero en compartir algo con la comunidad</Text>
                </View>
              )
          }
          renderItem={({ item }) => (
            <PostCard
              post={item}
              currentUserId={user?.id ?? ''}
              isAdmin={isAdmin}
              onDelete={handleDeletePost}
              onLike={handleLike}
              onComment={handleComment}
            />
          )}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage()
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage
              ? <ActivityIndicator color="#3B82F6" style={{ marginVertical: 16 }} />
              : null
          }
        />
      </KeyboardAvoidingView>

      <CommentsModal
        post={selectedPost}
        visible={showComments}
        onClose={() => setShowComments(false)}
      />
    </SafeAreaView>
  )
}
