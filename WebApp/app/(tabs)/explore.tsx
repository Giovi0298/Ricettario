import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, FlatList, TextInput, Button, View, ScrollView, TouchableOpacity, Modal } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useSocket } from '@/hooks/useSocket';

export default function RecipesScreen() {
  const { socket, isConnected } = useSocket();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  
  // Filter State
  const [homeIngredients, setHomeIngredients] = useState<number[]>([]);
  
  // Form State
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<any>(null);
  const [recipeName, setRecipeName] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [time, setTime] = useState('00:00');
  const [people, setPeople] = useState('2');
  
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
        setSteps(data.passaggi || []);
        setSelectedComponents(data.ingredienti?.map((i: any) => i.id) || []);
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
    // Show recipes where ALL components are in homeIngredients
    return recipes.filter(recipe => {
      if (!recipe.ingredientIds || recipe.ingredientIds.length === 0) return true;
      return recipe.ingredientIds.every((id: number) => homeIngredients.includes(id));
    });
  }, [recipes, homeIngredients]);

  const openAddModal = () => {
    setEditingRecipe(null);
    setRecipeName('');
    setDifficulty('');
    setPeople('2');
    setSteps([]);
    setSelectedComponents([]);
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

  const toggleHomeIngredient = (id: number) => {
    if (homeIngredients.includes(id)) {
      setHomeIngredients(homeIngredients.filter(i => i !== id));
    } else {
      setHomeIngredients([...homeIngredients, id]);
    }
  };

  const saveRecipe = () => {
    const recipeData = {
      id: editingRecipe?.id,
      Nome: recipeName,
      Difficoltà: parseInt(difficulty) || 1,
      TempoTotale: time,
      NumeroPersone: parseInt(people) || 1,
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
              onPress={() => toggleHomeIngredient(ing.id)}
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
            <ThemedText style={styles.itemName}>{item.Nome}</ThemedText>
            <ThemedText style={styles.itemDetails}>Difficoltà: {item.Difficoltà} | Persone: {item.NumeroPersone} | Tempo: {item.TempoTotale}</ThemedText>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<ThemedText style={styles.emptyText}>Nessuna ricetta trovata con questi ingredienti.</ThemedText>}
      />

      <Modal visible={isModalVisible} animationType="slide" transparent={false}>
        <ThemedView style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <ThemedText type="title">{editingRecipe ? 'Modifica Ricetta' : 'Nuova Ricetta'}</ThemedText>
            
            <ThemedView style={styles.formGroup}>
              <ThemedText style={styles.label}>Nome della Ricetta</ThemedText>
              <TextInput style={styles.input} placeholder="Es: Pasta al Pomodoro" value={recipeName} onChangeText={setRecipeName} placeholderTextColor="#888" />
            </ThemedView>

            <View style={{ flexDirection: 'row', gap: 15 }}>
              <ThemedView style={[styles.formGroup, { flex: 1 }]}>
                <ThemedText style={styles.label}>Difficoltà (1-5)</ThemedText>
                <TextInput style={styles.input} placeholder="2" value={difficulty} onChangeText={setDifficulty} keyboardType="numeric" placeholderTextColor="#888" />
              </ThemedView>
              <ThemedView style={[styles.formGroup, { flex: 1 }]}>
                <ThemedText style={styles.label}>Persone</ThemedText>
                <TextInput style={styles.input} placeholder="4" value={people} onChangeText={setPeople} keyboardType="numeric" placeholderTextColor="#888" />
              </ThemedView>
            </View>

            <ThemedView style={styles.formGroup}>
              <ThemedText style={styles.label}>Tempo Totale (calcolato)</ThemedText>
              <TextInput style={[styles.input, { backgroundColor: '#2a2a2a' }]} editable={false} value={time} />
            </ThemedView>

            <ThemedText type="subtitle">Composizione (Ingredienti e Sotto-Ricette)</ThemedText>
            
            <ThemedText style={styles.miniLabel}>Ingredienti Base</ThemedText>
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

            <ThemedText style={styles.miniLabel}>Sotto-Ricette (Usa altre ricette come ingredienti)</ThemedText>
            <View style={styles.ingredientsGrid}>
              {recipes.filter(r => r.id !== editingRecipe?.id).map(r => (
                <TouchableOpacity 
                  key={r.id} 
                  style={[styles.chip, styles.chipRecipe, selectedComponents.includes(r.id) && styles.chipSelected]}
                  onPress={() => toggleComponent(r.id)}
                >
                  <ThemedText style={selectedComponents.includes(r.id) ? styles.chipTextSelected : {}}>{r.Nome}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <ThemedText type="subtitle">Passaggi</ThemedText>
            {steps.map((s, index) => (
              <View key={index} style={styles.stepItem}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontWeight: 'bold' }}>{index + 1}. {s.descrizione}</ThemedText>
                  <ThemedText style={{ fontSize: 12, color: '#aaa' }}>Durata: {s.tempo}</ThemedText>
                </View>
                <TouchableOpacity onPress={() => setSteps(steps.filter((_, i) => i !== index))}>
                  <ThemedText style={{ color: 'red' }}>Elimina</ThemedText>
                </TouchableOpacity>
              </View>
            ))}
            
            <ThemedView style={styles.addStepBox}>
              <ThemedText style={styles.label}>Nuovo Passaggio</ThemedText>
              <TextInput style={styles.input} placeholder="Cosa fare..." value={currentStepDesc} onChangeText={setCurrentStepDesc} placeholderTextColor="#888" />
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                <ThemedText style={{ marginRight: 10 }}>HH:MM</ThemedText>
                <TextInput style={[styles.input, { width: 80 }]} value={currentStepTime} onChangeText={setCurrentStepTime} placeholderTextColor="#888" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Button title="Aggiungi" onPress={addStep} />
                </View>
              </View>
            </ThemedView>

            <View style={styles.modalButtons}>
              <Button title="Chiudi" color="#666" onPress={() => setModalVisible(false)} />
              <Button title="Salva" onPress={saveRecipe} />
            </View>
          </ScrollView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  filterSection: { marginBottom: 20 },
  filterScroll: { marginTop: 10, flexDirection: 'row' },
  item: { padding: 15, backgroundColor: '#1d1d1d', marginBottom: 10, borderRadius: 12, borderLeftWidth: 5, borderLeftColor: '#007AFF' },
  itemName: { fontSize: 18, fontWeight: 'bold' },
  itemDetails: { fontSize: 13, color: '#aaa', marginTop: 5 },
  emptyText: { textAlign: 'center', color: '#666', marginTop: 30 },
  modalContainer: { flex: 1, backgroundColor: '#121212', padding: 20 },
  scrollContent: { paddingBottom: 60 },
  formGroup: { marginBottom: 15 },
  label: { fontSize: 14, color: '#aaa', marginBottom: 5 },
  miniLabel: { fontSize: 12, color: '#666', marginTop: 10, marginBottom: 5, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: '#333', padding: 12, borderRadius: 8, color: '#fff', backgroundColor: '#1a1a1a' },
  ingredientsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, borderWidth: 1, borderColor: '#333', backgroundColor: '#1a1a1a' },
  chipSmall: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: '#333', marginRight: 8, backgroundColor: '#1a1a1a' },
  chipRecipe: { borderColor: '#007AFF33', backgroundColor: '#007AFF11' },
  chipSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  chipTextSmall: { fontSize: 12, color: '#ccc' },
  chipTextSelected: { color: '#fff' },
  stepItem: { padding: 12, backgroundColor: '#1a1a1a', borderRadius: 8, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  addStepBox: { marginTop: 20, padding: 15, backgroundColor: '#1a1a1a', borderRadius: 10, borderWidth: 1, borderColor: '#333' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 30 }
});
