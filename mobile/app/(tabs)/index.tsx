import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  Pressable,
  Modal,
  ScrollView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { fetchInstagramProfile, fetchPostDetail } from '../../services/api';
import { useAppTheme } from '../../context/ThemeContext';

type Post = {
  postUrl: string | null;
  imageUrl: string | null;
  caption: string | null;
};

type ProfileResponse = {
  profile: {
    username: string;
    fullName: string | null;
    bio: string | null;
    profilePicUrl: string | null;
    coverPhotoUrl: string | null;
    followers: string | null;
    following: string | null;
    postsCount: string | null;
    isPrivate: boolean;
    privateMessage: string | null;
  };
  posts: Post[];
  scrapedAt: string;
};

type PostDetail = {
  postUrl: string;
  type: 'image' | 'video' | 'carousel';
  items: Array<{
    type: 'image' | 'video';
    url: string;
  }>;
  caption: string | null;
};

export default function HomeScreen() {
  const [username, setUsername] = useState('natgeo');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [postDetail, setPostDetail] = useState<PostDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [profileImageOpen, setProfileImageOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isDark, themeMode, setThemeMode } = useAppTheme();

  const theme = useMemo(
    () => ({
      bg: isDark ? '#0b1020' : '#f5f7fb',
      card: isDark ? '#121a2b' : '#ffffff',
      elevated: isDark ? '#182235' : '#ffffff',
      text: isDark ? '#f8fafc' : '#0f172a',
      muted: isDark ? '#94a3b8' : '#64748b',
      border: isDark ? '#22304a' : '#e2e8f0',
      accent: '#4f8cff',
      accentSoft: isDark ? '#1e3a8a' : '#dbeafe',
      danger: '#ef4444',
      shadow: '#000000'
    }),
    [isDark]
  );

  const horizontalPadding = width < 380 ? 14 : width < 768 ? 18 : 24;
  const maxContentWidth = width > 900 ? 860 : width - horizontalPadding * 2;
  const numColumns = width >= 900 ? 3 : width >= 620 ? 3 : 2;
  const gap = 10;
  const imageSize = (maxContentWidth - gap * (numColumns - 1)) / numColumns;

  const handleSearch = async () => {
    try {
      if (!username.trim()) return;

      setLoading(true);
      setError(null);
      setData(null);

      const result = await fetchInstagramProfile(username.trim());
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  };

  const openPostDetail = async (post: Post) => {
    try {
      if (!post.postUrl) return;

      setSelectedPost(post);
      setPostDetail(null);
      setLoadingDetail(true);

      const detail = await fetchPostDetail(post.postUrl);
      setPostDetail(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir el post');
    } finally {
      setLoadingDetail(false);
    }
  };

  const renderHeader = () => {
    if (!data) return null;

    return (
      <View>
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              shadowColor: theme.shadow
            }
          ]}
        >
          <View style={styles.coverWrapper}>
            {data.profile.coverPhotoUrl ? (
              <Image
                source={{ uri: data.profile.coverPhotoUrl }}
                style={styles.coverImage}
              />
            ) : (
              <View style={[styles.coverImage, { backgroundColor: theme.accentSoft }]} />
            )}

            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.55)']}
              style={styles.coverOverlay}
            />
          </View>

          <View style={styles.profileContent}>
            <Pressable
              onPress={() => setProfileImageOpen(true)}
              style={[
                styles.avatarFrame,
                {
                  borderColor: theme.card,
                  backgroundColor: theme.card
                }
              ]}
            >
              {data.profile.profilePicUrl ? (
                <Image
                  source={{ uri: data.profile.profilePicUrl }}
                  style={styles.avatar}
                />
              ) : null}
            </Pressable>

            <Text style={[styles.fullName, { color: theme.text }]}>
              {data.profile.fullName || data.profile.username}
            </Text>

            <Text style={[styles.username, { color: theme.muted }]}>
              @{data.profile.username}
            </Text>

            <Text style={[styles.bio, { color: theme.text }]}>
              {data.profile.bio || 'Sin descripción disponible'}
            </Text>

            <View style={styles.statsRow}>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: theme.elevated, borderColor: theme.border }
                ]}
              >
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {data.profile.postsCount || '-'}
                </Text>
                <Text style={[styles.statLabel, { color: theme.muted }]}>Posts</Text>
              </View>

              <View
                style={[
                  styles.statCard,
                  { backgroundColor: theme.elevated, borderColor: theme.border }
                ]}
              >
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {data.profile.followers || '-'}
                </Text>
                <Text style={[styles.statLabel, { color: theme.muted }]}>
                  Seguidores
                </Text>
              </View>

              <View
                style={[
                  styles.statCard,
                  { backgroundColor: theme.elevated, borderColor: theme.border }
                ]}
              >
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {data.profile.following || '-'}
                </Text>
                <Text style={[styles.statLabel, { color: theme.muted }]}>
                  Siguiendo
                </Text>
              </View>
            </View>

            {data.profile.isPrivate ? (
              <View
                style={[
                  styles.privateBanner,
                  { backgroundColor: isDark ? '#3a1720' : '#fee2e2' }
                ]}
              >
                <Text style={[styles.privateText, { color: theme.danger }]}>
                  {data.profile.privateMessage || 'Este perfil está en privado'}
                </Text>
              </View>
            ) : (
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Publicaciones
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.muted }]}>
                  Primeras {data.posts.length} publicaciones encontradas
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <View
        style={[
          styles.screen,
          {
            paddingTop: Math.max(insets.top, 8),
            backgroundColor: theme.bg
          }
        ]}
      >
        <View
          style={[
            styles.content,
            {
              width: maxContentWidth,
              alignSelf: 'center'
            }
          ]}
        >
          <View style={styles.headerRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.title, { color: theme.text }]}>
                Instagram Scraper
              </Text>
              <Text style={[styles.subtitle, { color: theme.muted }]}>
                Consulta perfiles públicos y visualiza sus primeras publicaciones
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setThemeMenuOpen(true)}
              style={[
                styles.themeButton,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border
                }
              ]}
              activeOpacity={0.9}
            >
              <Text style={{ color: theme.text, fontSize: 18 }}>⚙️</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  color: theme.text
                }
              ]}
              placeholder="Escribe un username"
              placeholderTextColor={theme.muted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />

            <TouchableOpacity
              style={[styles.searchButton, { backgroundColor: theme.accent }]}
              onPress={handleSearch}
              activeOpacity={0.9}
            >
              <Text style={styles.searchButtonText}>Buscar</Text>
            </TouchableOpacity>
          </View>

          {loading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={theme.accent} />
              <Text style={[styles.loadingText, { color: theme.muted }]}>
                Consultando perfil...
              </Text>
            </View>
          )}

          {error && (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: isDark ? '#34151b' : '#fee2e2' }
              ]}
            >
              <Text style={[styles.errorText, { color: theme.danger }]}>
                {error}
              </Text>
            </View>
          )}

          {data && (
            <FlatList
              data={data.posts}
              key={numColumns}
              numColumns={numColumns}
              keyExtractor={(item, index) => item.postUrl || String(index)}
              ListHeaderComponent={renderHeader}
              contentContainerStyle={{ paddingBottom: 32 }}
              columnWrapperStyle={
                numColumns > 1 ? { gap, marginBottom: gap } : undefined
              }
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => openPostDetail(item)}
                  style={[
                    styles.postCard,
                    {
                      width: imageSize,
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                      shadowColor: theme.shadow
                    }
                  ]}
                >
                  {item.imageUrl ? (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={{ width: imageSize, height: imageSize }}
                    />
                  ) : (
                    <View
                      style={[
                        styles.imageFallback,
                        {
                          width: imageSize,
                          height: imageSize,
                          backgroundColor: theme.border
                        }
                      ]}
                    >
                      <Text style={{ color: theme.muted }}>Sin imagen</Text>
                    </View>
                  )}
                </Pressable>
              )}
            />
          )}
        </View>

        <Modal
          visible={!!selectedPost}
          animationType="slide"
          transparent
          onRequestClose={() => {
            setSelectedPost(null);
            setPostDetail(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: theme.accent }]}
                onPress={() => {
                  setSelectedPost(null);
                  setPostDetail(null);
                }}
              >
                <Text style={styles.searchButtonText}>Cerrar</Text>
              </TouchableOpacity>

              <ScrollView showsVerticalScrollIndicator={false}>
                {loadingDetail ? (
                  <ActivityIndicator size="large" color={theme.accent} />
                ) : postDetail ? (
                  <>
                    {postDetail.items.map((item, index) => (
                      <View key={`${item.url}-${index}`} style={{ marginBottom: 12 }}>
                        {item.type === 'video' ? (
                          <Video
                            source={{ uri: item.url }}
                            style={styles.modalImage}
                            useNativeControls
                            resizeMode={ResizeMode.CONTAIN}
                            shouldPlay={false}
                          />
                        ) : (
                          <Image
                            source={{ uri: item.url }}
                            style={styles.modalImage}
                            resizeMode="cover"
                          />
                        )}
                      </View>
                    ))}

                    <Text style={[styles.modalHeading, { color: theme.text }]}>
                      Descripción
                    </Text>
                    <Text style={[styles.modalBody, { color: theme.muted }]}>
                      {postDetail.caption || selectedPost?.caption || 'Sin descripción'}
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.modalBody, { color: theme.muted }]}>
                    No se pudo cargar el detalle del post.
                  </Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={profileImageOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setProfileImageOpen(false)}
        >
          <Pressable
            style={styles.fullscreenOverlay}
            onPress={() => setProfileImageOpen(false)}
          >
            {data?.profile.profilePicUrl ? (
              <Image
                source={{ uri: data.profile.profilePicUrl }}
                style={styles.fullscreenProfileImage}
                resizeMode="contain"
              />
            ) : null}
          </Pressable>
        </Modal>

        <Modal
          visible={themeMenuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setThemeMenuOpen(false)}
        >
          <Pressable
            style={styles.fullscreenOverlay}
            onPress={() => setThemeMenuOpen(false)}
          >
            <Pressable
              style={[
                styles.themeMenu,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border
                }
              ]}
            >
              <Text style={[styles.themeMenuTitle, { color: theme.text }]}>
                Seleccionar tema
              </Text>

              <TouchableOpacity
                style={[
                  styles.themeMenuItem,
                  themeMode === 'light' && { backgroundColor: theme.accentSoft }
                ]}
                onPress={() => {
                  setThemeMode('light');
                  setThemeMenuOpen(false);
                }}
              >
                <Text style={{ color: theme.text }}>☀️ Claro</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themeMenuItem,
                  themeMode === 'dark' && { backgroundColor: theme.accentSoft }
                ]}
                onPress={() => {
                  setThemeMode('dark');
                  setThemeMenuOpen(false);
                }}
              >
                <Text style={{ color: theme.text }}>🌙 Oscuro</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themeMenuItem,
                  themeMode === 'system' && { backgroundColor: theme.accentSoft }
                ]}
                onPress={() => {
                  setThemeMode('system');
                  setThemeMenuOpen(false);
                }}
              >
                <Text style={{ color: theme.text }}>⚙️ Sistema</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1
  },
  screen: {
    flex: 1
  },
  content: {
    flex: 1
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2
  },
  subtitle: {
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18
  },
  themeButton: {
    borderWidth: 1,
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18
  },
  input: {
    flex: 1,
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    fontSize: 16
  },
  searchButton: {
    minWidth: 110,
    minHeight: 54,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  },
  loadingBox: {
    alignItems: 'center',
    marginTop: 18
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14
  },
  errorBox: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 14
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600'
  },
  heroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 18,
    borderWidth: 1,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  coverWrapper: {
    width: '100%',
    height: 210
  },
  coverImage: {
    width: '100%',
    height: '100%'
  },
  coverOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0
  },
  profileContent: {
    paddingHorizontal: 18,
    paddingBottom: 22,
    alignItems: 'center'
  },
  avatarFrame: {
    width: 114,
    height: 114,
    borderRadius: 57,
    marginTop: -57,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4
  },
  avatar: {
    width: 102,
    height: 102,
    borderRadius: 51
  },
  fullName: {
    marginTop: 12,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center'
  },
  username: {
    marginTop: 4,
    fontSize: 18
  },
  bio: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 620
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 18,
    width: '100%'
  },
  statCard: {
    minWidth: 96,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800'
  },
  statLabel: {
    fontSize: 13,
    marginTop: 4
  },
  privateBanner: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14
  },
  privateText: {
    fontSize: 14,
    fontWeight: '700'
  },
  sectionHeader: {
    marginTop: 22,
    width: '100%'
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800'
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13
  },
  postCard: {
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  imageFallback: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    maxHeight: '86%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 18
  },
  closeButton: {
    alignSelf: 'flex-end',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginBottom: 14
  },
  modalImage: {
    width: '100%',
    height: 320,
    borderRadius: 18
  },
  modalHeading: {
    fontSize: 19,
    fontWeight: '800',
    marginTop: 14,
    marginBottom: 8
  },
  modalBody: {
    fontSize: 15,
    lineHeight: 22
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  fullscreenProfileImage: {
    width: '100%',
    height: '70%'
  },
  themeMenu: {
    width: 260,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14
  },
  themeMenuTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10
  },
  themeMenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 6
  }
});