import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, TextInput, Button, View, Image, TouchableOpacity, ActivityIndicator, Modal, Alert } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useSocket } from '@/hooks/useSocket';
import { useImagePicker } from '@/hooks/useImagePicker';

export default function HomeScreen() {
  const { socket, isConnected } = useSocket();
  const { pickAndUploadImage, uploading } = useImagePicker();
  const [ingredients, setIngredients] = useState<any[]>([]);
  
  // Form State (New/Edit)
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<any>(null);
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (socket && isConnected) {
      socket.emit('get_ingredients');
      socket.on('ingredients_list', (data: any[]) => setIngredients(data));
      return () => {
        socket.off('ingredients_list');
      };
    }
  }, [socket, isConnected]);

  const handlePickImage = async () => {
    const url = await pickAndUploadImage();
    if (url) setImageUrl(url);
  };

  const openAddModal = () => {
    setEditingIngredient(null);
    setName('');
    setImageUrl('');
    setModalVisible(true);
  };

  const openEditModal = (item: any) => {
    setEditingIngredient(item);
    setName(item.Nome);
    setImageUrl(item.Immagine || '');
    setModalVisible(true);
  };

  const saveIngredient = () => {
    if (!name.trim()) return;
    
    const data = { id: editingIngredient?.id, Nome: name, Immagine: imageUrl };
    if (editingIngredient) {
      socket?.emit('update_ingredient', data);
    } else {
      socket?.emit('add_ingredient', data);
    }
    setModalVisible(false);
  };

  const deleteIngredient = (id: number) => {
    Alert.alert(
      "Elimina Ingrediente",
      "Sei sicuro? Verrà rimosso anche da tutte le ricette che lo contengono.",
      [
        { text: "Annulla", style: "cancel" },
        { 
          text: "Elimina", 
          style: "destructive", 
          onPress: () => socket?.emit('delete_ingredient', id) 
        }
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Ingredienti</ThemedText>
        <Button title="+ Nuovo" onPress={openAddModal} />
      </ThemedView>

      <FlatList
        data={ingredients}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ThemedView style={styles.item}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              {item.Immagine ? (
                <Image source={{ uri: item.Immagine }} style={styles.itemImage} />
              ) : (
                <View style={[styles.itemImage, { backgroundColor: '#333' }]} />
              )}
              <ThemedText style={styles.itemName}>{item.Nome}</ThemedText>
            </View>
            <View style={styles.itemActions}>
              <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionBtn}>
                <ThemedText style={{ color: '#007AFF' }}>Modifica</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteIngredient(item.id)} style={styles.actionBtn}>
                <ThemedText style={{ color: 'red' }}>Elimina</ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        )}
        style={styles.list}
      />

      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedText type="subtitle" style={{ marginBottom: 20 }}>
              {editingIngredient ? 'Modifica Ingrediente' : 'Nuovo Ingrediente'}
            </ThemedText>
            
            <TextInput
              style={styles.input}
              placeholder="Nome ingrediente..."
              value={name}
              onChangeText={setName}
              placeholderTextColor="#888"
            />
            
            <View style={styles.imageUploadRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 10 }]}
                placeholder="URL Immagine..."
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholderTextColor="#888"
              />
              <TouchableOpacity style={styles.uploadBtn} onPress={handlePickImage} disabled={uploading}>
                {uploading ? <ActivityIndicator size="small" color="#fff" /> : <ThemedText style={{ color: '#fff', fontSize: 20 }}>📷</ThemedText>}
              </TouchableOpacity>
            </View>

            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.previewImage} />
            ) : null}

            <View style={styles.modalButtons}>
              <Button title="Annulla" color="#666" onPress={() => setModalVisible(false)} />
              <Button title="Salva" onPress={saveIngredient} />
            </View>
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  list: { flex: 1 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#1d1d1d', marginBottom: 10, borderRadius: 12 },
  itemImage: { width: 45, height: 45, borderRadius: 22.5, marginRight: 15 },
  itemName: { fontSize: 16, fontWeight: '500', flex: 1 },
  itemActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { padding: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  input: { borderWidth: 1, borderColor: '#333', padding: 12, marginBottom: 15, borderRadius: 10, color: '#fff', backgroundColor: '#1a1a1a' },
  imageUploadRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  uploadBtn: { width: 50, height: 50, backgroundColor: '#007AFF', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  previewImage: { width: '100%', height: 150, borderRadius: 10, marginBottom: 20, resizeMode: 'cover' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 }
});
