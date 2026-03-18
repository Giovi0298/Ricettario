import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, FlatList, TextInput, Button, View, ScrollView, TouchableOpacity, Modal, Image, ActivityIndicator } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useSocket } from '@/hooks/useSocket';
import { useImagePicker } from '@/hooks/useImagePicker';
import { ExternalLink } from '@/components/external-link';
import ParallaxScrollView from '@/components/parallax-scroll-view';

export default function RecipesScreen() {
  const { socket, isConnected } = useSocket();
  const { pickAndUploadImage, uploading } = useImagePicker();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  
  // Filter State
  const [homeIngredients, setHomeIngredients] = useState<number[]>([]);
  
  // Form/View State
  const [isModalVisible, setModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'view' | 'edit'>('view');
  const [editingRecipe, setEditingRecipe] = useState<any>(null);
  
  const [recipeName, setRecipeName] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [time, setTime] = useState('00:00');
  const [people, setPeople] = useState('2');
  const [link, setLink] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  const [steps, setSteps] = useState<{ descrizione: string, tempo: string }[]>([]);
  const [currentStepDesc, setCurrentStepDesc] = useState('');
  const [currentStepTime, setCurrentStepTime] = useState('00:05');

  const [selectedComponents, setSelectedComponents] = useState<number[]>([]);

  // Auto-calculate total time when steps change
  useEffect(() => {
    const totalMinutes = steps.reduce((acc, step) => {
      const parts = step.tempo.split(':');
      if (parts.length !== 2) return acc;
      const h = parseInt(parts[0]) || 0;
      const m = parseInt(parts[1]) || 0;
      return acc + (h * 60 + m);
    }, 0);
    
    const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const m = (totalMinutes % 60).toString().padStart(2, '0');
    setTime(`${h}:${m}`);
  }, [steps]);

  useEffect(() => {
    if (socket && isConnected) {
      socket.emit('get_recipes');
      socket.emit('get_ingredients');

      socket.on('recipes_list', (data: any[]) => setRecipes(data));
      socket.on('ingredients_list', (data: any[]) => setIngredients(data));
      socket.on('recipe_details', (data: any) => {
        setEditingRecipe(data);
        setRecipeName(data.Nome);
        setDifficulty(data.Difficoltà?.toString() || '');
        setPeople(data.NumeroPersone?.toString() || '2');
        setLink(data.Link || '');
        setImageUrl(data.Immagine || '');
        setSteps(data.passaggi || []);
        setSelectedComponents(data.ingredienti?.map((i: any) => i.id) || []);
        setViewMode('view');
        setModalVisible(true);
      });

      return () => {
        socket.off('recipes_list');
        socket.off('ingredients_list');
        socket.off('recipe_details');
      };
    }
  }, [socket, isConnected]);

  const filteredRecipes = useMemo(() => {
    if (homeIngredients.length === 0) return recipes;
    return recipes.filter(recipe => {
      if (!recipe.ingredientIds || recipe.ingredientIds.length === 0) return true;
      return recipe.ingredientIds.every((id: number) => homeIngredients.includes(id));
    });
  }, [recipes, homeIngredients]);

  const handlePickImage = async () => {
    const url = await pickAndUploadImage();
    if (url) setImageUrl(url);
  };

  const openAddModal = () => {
    setEditingRecipe(null);
    setRecipeName('');
    setDifficulty('');
    setPeople('2');
    setLink('');
    setImageUrl('');
    setSteps([]);
    setSelectedComponents([]);
    setViewMode('edit');
    setModalVisible(true);
  };

  const addStep = () => {
    if (currentStepDesc.trim()) {
      setSteps([...steps, { descrizione: currentStepDesc, tempo: currentStepTime }]);
      setCurrentStepDesc('');
      setCurrentStepTime('00:05');
    }
  };

  const toggleComponent = (id: number) => {
    if (selectedComponents.includes(id)) {
      setSelectedComponents(selectedComponents.filter(i => i !== id));
    } else {
      setSelectedComponents([...selectedComponents, id]);
    }
  };

  const saveRecipe = () => {
    const recipeData = {
      id: editingRecipe?.id,
      Nome: recipeName,
      Difficoltà: parseInt(difficulty) || 1,
      TempoTotale: time,
      NumeroPersone: parseInt(people) || 1,
      Link: link,
      Immagine: imageUrl,
      passaggi: steps,
      ingredienti: selectedComponents
    };

    if (editingRecipe) {
      socket?.emit('update_recipe', recipeData);
    } else {
      socket?.emit('add_recipe', recipeData);
    }
    setModalVisible(false);
  };

  const renderHeaderImage = () => {
    if (imageUrl) {
      return <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} />;
    }
    return (
      <View style={{ width: '100%', height: '100%', backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }}>
        <ThemedText style={{ color: '#666', fontSize: 60 }}>🍳</ThemedText>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Ricettario</ThemedText>
        <Button title="+ Ricetta" onPress={openAddModal} />
      </ThemedView>

      <ThemedView style={styles.filterSection}>
        <ThemedText style={styles.label}>Cosa hai in casa? (Filtra ricette)</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {ingredients.map(ing => (
            <TouchableOpacity 
              key={ing.id} 
              style={[styles.chipSmall, homeIngredients.includes(ing.id) && styles.chipSelected]}
              onPress={() => {
                if (homeIngredients.includes(ing.id)) setHomeIngredients(homeIngredients.filter(i => i !== ing.id));
                else setHomeIngredients([...homeIngredients, ing.id]);
              }}
            >
              <ThemedText style={[styles.chipTextSmall, homeIngredients.includes(ing.id) && styles.chipTextSelected]}>{ing.Nome}</ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ThemedView>

      <FlatList
        data={filteredRecipes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.item}
            onPress={() => socket?.emit('get_recipe_details', item.id)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {item.Immagine ? (
                <Image source={{ uri: item.Immagine }} style={styles.listItemImage} />
              ) : (
                <View style={[styles.listItemImage, { backgroundColor: '#333' }]} />
              )}
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.itemName}>{item.Nome}</ThemedText>
                <ThemedText style={styles.itemDetails}>Diff: {item.Difficoltà} | Pers: {item.NumeroPersone} | {item.TempoTotale}</ThemedText>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<ThemedText style={styles.emptyText}>Nessuna ricetta trovata.</ThemedText>}
      />

      <Modal visible={isModalVisible} animationType="slide">
        {viewMode === 'view' ? (
          <ParallaxScrollView
            headerBackgroundColor={{ light: '#D0D0D0', dark: '#1D3D47' }}
            headerImage={renderHeaderImage()}>
            <View style={styles.viewContent}>
              <View style={styles.viewHeader}>
                <ThemedText type="title">{recipeName}</ThemedText>
                <TouchableOpacity onPress={() => setViewMode('edit')} style={styles.editBtn}>
                  <ThemedText style={{ color: '#007AFF' }}>Modifica</ThemedText>
                </TouchableOpacity>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}><ThemedText style={styles.statVal}>{difficulty}</ThemedText><ThemedText style={styles.statLab}>Difficoltà</ThemedText></View>
                <View style={styles.statItem}><ThemedText style={styles.statVal}>{people}</ThemedText><ThemedText style={styles.statLab}>Persone</ThemedText></View>
                <View style={styles.statItem}><ThemedText style={styles.statVal}>{time}</ThemedText><ThemedText style={styles.statLab}>Tempo</ThemedText></View>
              </View>

              {link ? (
                <ExternalLink href={link as any} style={styles.viewLink}>
                  <ThemedText style={{ color: '#007AFF' }}>🌐 Vai al sito della ricetta</ThemedText>
                </ExternalLink>
              ) : null}

              <ThemedText type="subtitle">Ingredienti</ThemedText>
              <View style={styles.ingredientsGrid}>
                {editingRecipe?.ingredienti?.map((ing: any) => (
                  <View key={ing.id} style={styles.chipDisabled}>
                    <ThemedText>{ing.Nome}</ThemedText>
                  </View>
                ))}
              </View>

              <ThemedText type="subtitle">Preparazione</ThemedText>
              {steps.map((s, index) => (
                <View key={index} style={styles.stepItemView}>
                  <ThemedText style={styles.stepNum}>{index + 1}</ThemedText>
                  <View style={{ flex: 1 }}>
                    <ThemedText>{s.descrizione}</ThemedText>
                    <ThemedText style={{ color: '#666', fontSize: 12 }}>Durata: {s.tempo}</ThemedText>
                  </View>
                </View>
              ))}

              <View style={{ marginTop: 40 }}>
                <Button title="Chiudi" onPress={() => setModalVisible(false)} />
              </View>
            </View>
          </ParallaxScrollView>
        ) : (
          <ThemedView style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <ThemedText type="title">{editingRecipe ? 'Modifica Ricetta' : 'Nuova Ricetta'}</ThemedText>
              
              <ThemedView style={styles.formGroup}>
                <ThemedText style={styles.label}>Nome della Ricetta</ThemedText>
                <TextInput style={styles.input} value={recipeName} onChangeText={setRecipeName} placeholderTextColor="#888" />
              </ThemedView>

              <ThemedView style={styles.formGroup}>
                <ThemedText style={styles.label}>URL Immagine o Carica</ThemedText>
                <View style={styles.imageUploadContainer}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 10 }]}
                    placeholder="https://..."
                    value={imageUrl}
                    onChangeText={setImageUrl}
                    placeholderTextColor="#888"
                  />
                  <TouchableOpacity 
                    style={styles.uploadBtn} 
                    onPress={handlePickImage}
                    disabled={uploading}
                  >
                    {uploading ? <ActivityIndicator size="small" color="#fff" /> : <ThemedText style={{ color: '#fff', fontSize: 20 }}>📷</ThemedText>}
                  </TouchableOpacity>
                </View>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.previewImage} />
                ) : null}
              </ThemedView>

              <View style={{ flexDirection: 'row', gap: 15 }}>
                <ThemedView style={[styles.formGroup, { flex: 1 }]}>
                  <ThemedText style={styles.label}>Difficoltà (1-5)</ThemedText>
                  <TextInput style={styles.input} value={difficulty} onChangeText={setDifficulty} keyboardType="numeric" placeholderTextColor="#888" />
                </ThemedView>
                <ThemedView style={[styles.formGroup, { flex: 1 }]}>
                  <ThemedText style={styles.label}>Persone</ThemedText>
                  <TextInput style={styles.input} value={people} onChangeText={setPeople} keyboardType="numeric" placeholderTextColor="#888" />
                </ThemedView>
              </View>

              <ThemedView style={styles.formGroup}>
                <ThemedText style={styles.label}>Tempo Totale (calcolato)</ThemedText>
                <TextInput style={[styles.input, { backgroundColor: '#2a2a2a' }]} editable={false} value={time} />
              </ThemedView>

              <ThemedView style={styles.formGroup}>
                <ThemedText style={styles.label}>Link al sito</ThemedText>
                <TextInput style={styles.input} value={link} onChangeText={setLink} placeholderTextColor="#888" />
              </ThemedView>

              <ThemedText type="subtitle">Ingredienti e Sotto-Ricette</ThemedText>
              <View style={styles.ingredientsGrid}>
                {ingredients.map(ing => (
                  <TouchableOpacity 
                    key={ing.id} 
                    style={[styles.chip, selectedComponents.includes(ing.id) && styles.chipSelected]}
                    onPress={() => toggleComponent(ing.id)}
                  >
                    <ThemedText style={selectedComponents.includes(ing.id) ? styles.chipTextSelected : {}}>{ing.Nome}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText type="subtitle">Passaggi</ThemedText>
              {steps.map((s, index) => (
                <View key={index} style={styles.stepItem}>
                  <View style={{ flex: 1 }}>
                    <ThemedText>{s.descrizione} ({s.tempo})</ThemedText>
                  </View>
                  <TouchableOpacity onPress={() => setSteps(steps.filter((_, i) => i !== index))}>
                    <ThemedText style={{ color: 'red' }}>Elimina</ThemedText>
                  </TouchableOpacity>
                </View>
              ))}
              
              <ThemedView style={styles.addStepBox}>
                <TextInput style={styles.input} placeholder="Cosa fare..." value={currentStepDesc} onChangeText={setCurrentStepDesc} placeholderTextColor="#888" />
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                  <TextInput style={[styles.input, { width: 80 }]} value={currentStepTime} onChangeText={setCurrentStepTime} placeholderTextColor="#888" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Button title="Aggiungi" onPress={addStep} />
                  </View>
                </View>
              </ThemedView>

              <View style={styles.modalButtons}>
                <Button title="Annulla" color="#666" onPress={() => editingRecipe ? setViewMode('view') : setModalVisible(false)} />
                <Button title="Salva" onPress={saveRecipe} />
              </View>
            </ScrollView>
          </ThemedView>
        )}
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  filterSection: { marginBottom: 20 },
  filterScroll: { marginTop: 10, flexDirection: 'row' },
  item: { padding: 12, backgroundColor: '#1d1d1d', marginBottom: 10, borderRadius: 12 },
  listItemImage: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  itemName: { fontSize: 16, fontWeight: 'bold' },
  itemDetails: { fontSize: 12, color: '#aaa', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#666', marginTop: 30 },
  modalContainer: { flex: 1, backgroundColor: '#121212', padding: 20 },
  viewContent: { padding: 20 },
  viewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  editBtn: { padding: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#1a1a1a', padding: 15, borderRadius: 12, marginBottom: 25 },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: 'bold' },
  statLab: { fontSize: 10, color: '#666', textTransform: 'uppercase' },
  viewLink: { marginBottom: 25 },
  scrollContent: { paddingBottom: 60 },
  formGroup: { marginBottom: 15 },
  label: { fontSize: 14, color: '#aaa', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#333', padding: 12, borderRadius: 8, color: '#fff', backgroundColor: '#1a1a1a' },
  imageUploadContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  uploadBtn: { width: 50, height: 44, backgroundColor: '#007AFF', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  previewImage: { width: '100%', height: 120, borderRadius: 8, marginTop: 10, resizeMode: 'cover' },
  ingredientsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, borderWidth: 1, borderColor: '#333', backgroundColor: '#1a1a1a' },
  chipSmall: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: '#333', marginRight: 8, backgroundColor: '#1a1a1a' },
  chipDisabled: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333' },
  chipSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  chipTextSmall: { fontSize: 12, color: '#ccc' },
  chipTextSelected: { color: '#fff' },
  stepItem: { padding: 12, backgroundColor: '#1a1a1a', borderRadius: 8, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  stepItemView: { flexDirection: 'row', marginBottom: 20 },
  stepNum: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#007AFF', textAlign: 'center', lineHeight: 30, color: '#fff', fontWeight: 'bold', marginRight: 15 },
  addStepBox: { marginTop: 20, padding: 15, backgroundColor: '#1a1a1a', borderRadius: 10, borderWidth: 1, borderColor: '#333' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 30 }
});
