import { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import { fetchInstagramProfile } from "./services/api";

const screenWidth = Dimensions.get("window").width;
const imageSize = screenWidth / 3 - 12;

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

export default function App() {
  const [username, setUsername] = useState("natgeo");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    try {
      setLoading(true);
      setError(null);
      setData(null);

      const result = await fetchInstagramProfile(username.trim());
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Instagram Scraper Mobile</Text>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Escribe un username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.button} onPress={handleSearch}>
          <Text style={styles.buttonText}>Buscar</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}

      {error && <Text style={styles.error}>{error}</Text>}

      {data && (
        <FlatList
          data={data.posts}
          keyExtractor={(item, index) => item.postUrl || `${index}`}
          numColumns={3}
          ListHeaderComponent={
            <View style={styles.profileContainer}>
              {data.profile.profilePicUrl && (
                <Image
                  source={{ uri: data.profile.profilePicUrl }}
                  style={styles.profileImage}
                />
              )}

              <Text style={styles.name}>
                {data.profile.fullName || data.profile.username}
              </Text>

              <Text style={styles.username}>@{data.profile.username}</Text>

              <Text style={styles.bio}>
                {data.profile.bio || "Sin descripción"}
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>
                    {data.profile.postsCount || "-"}
                  </Text>
                  <Text style={styles.statLabel}>Posts</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>
                    {data.profile.followers || "-"}
                  </Text>
                  <Text style={styles.statLabel}>Seguidores</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>
                    {data.profile.following || "-"}
                  </Text>
                  <Text style={styles.statLabel}>Siguiendo</Text>
                </View>
              </View>

              {data.profile.isPrivate && (
                <Text style={styles.privateText}>
                  {data.profile.privateMessage || "Este perfil está en privado"}
                </Text>
              )}

              {!data.profile.isPrivate && (
                <Text style={styles.sectionTitle}>Publicaciones</Text>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.postCard}>
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.postImage}
                />
              ) : (
                <View style={[styles.postImage, styles.emptyPost]}>
                  <Text>Sin imagen</Text>
                </View>
              )}
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 30 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
  },
  button: {
    backgroundColor: "#1877f2",
    borderRadius: 10,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  error: {
    color: "red",
    marginTop: 10,
    textAlign: "center",
  },
  profileContainer: {
    marginBottom: 16,
    alignItems: "center",
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
  },
  username: {
    fontSize: 16,
    color: "#666",
    marginBottom: 10,
  },
  bio: {
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  statBox: {
    alignItems: "center",
    marginHorizontal: 12,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    color: "#666",
  },
  privateText: {
    color: "#c62828",
    fontWeight: "600",
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    alignSelf: "flex-start",
    marginTop: 10,
    marginBottom: 12,
  },
  postCard: {
    margin: 4,
  },
  postImage: {
    width: imageSize,
    height: imageSize,
    borderRadius: 8,
  },
  emptyPost: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eee",
  },
});
